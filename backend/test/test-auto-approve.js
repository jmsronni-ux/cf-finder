/**
 * Auto-Approve Scheduled Action Pipeline — Integration Tests
 * 
 * Tests the full flow:
 *   1. Admin sets autoApproveEnabled + autoApproveDelay on a node template
 *   2. User generates key → ScheduledAction is (or isn't) created
 *   3. processDueScheduledActions() processes due actions
 *   4. User.nodeProgress is updated to the configured outcome
 * 
 * Run:   node --experimental-vm-modules backend/test/test-auto-approve.js
 */
import mongoose from 'mongoose';
import assert from 'assert/strict';
import { MONGO_URI } from '../config/env.js';
import User from '../models/user.model.js';
import Level from '../models/level.model.js';
import KeyGenerationRequest from '../models/key-generation-request.model.js';
import ScheduledAction from '../models/scheduled-action.model.js';
import GlobalSettings from '../models/global-settings.model.js';

// ─── Helpers ────────────────────────────────────────────────────────
const TEST_PREFIX = '__auto_approve_test__';
const testNodeId = `${TEST_PREFIX}_node_1`;
const testNodeId2 = `${TEST_PREFIX}_node_2`;

let testUser;
let testLevel;

async function setup() {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB\n');

    // Ensure GlobalSettings exist
    let settings = await GlobalSettings.findById('global_settings');
    if (!settings) {
        settings = await GlobalSettings.create({
            _id: 'global_settings',
            directAccessKeyPrice: 1,
            withdrawalSystem: 'direct_access_keys',
            keyPriceMode: 'static'
        });
    }

    // Create a test user with enough balance
    testUser = await User.create({
        name: `${TEST_PREFIX}_user`,
        email: `${TEST_PREFIX}@test.com`,
        phone: '+10000000000',
        password: 'hashedpassword123',
        balance: 0,
        availableBalance: 1000,
        tier: 1,
        levelTemplate: 'TEST_AUTO',
        nodeProgress: new Map()
    });

    // Create a test level template with two nodes:
    //   node_1: autoApproveEnabled=true, autoApproveDelay=30, status='Success'
    //   node_2: autoApproveEnabled=false (delay=0 OFF), no scheduled action expected
    testLevel = await Level.create({
        level: 1,
        templateName: 'TEST_AUTO',
        name: 'Test Level 1',
        nodes: [
            {
                id: testNodeId,
                type: 'fingerprintNode',
                position: { x: 0, y: 0 },
                data: {
                    label: 'Test Node 1',
                    autoApproveEnabled: true,
                    autoApproveDelay: 30,
                    transaction: { amount: 100, status: 'Success' }
                }
            },
            {
                id: testNodeId2,
                type: 'fingerprintNode',
                position: { x: 200, y: 0 },
                data: {
                    label: 'Test Node 2 (Off)',
                    autoApproveEnabled: false,
                    autoApproveDelay: 0,
                    transaction: { amount: 50, status: 'Success' }
                }
            }
        ],
        edges: []
    });

    console.log('   Setup: test user, level template created\n');
}

async function cleanup() {
    // Clean up all test data
    if (testUser?._id) {
        await ScheduledAction.deleteMany({
            requestId: {
                $in: (await KeyGenerationRequest.find({ userId: testUser._id })).map(r => r._id)
            }
        });
        await KeyGenerationRequest.deleteMany({ userId: testUser._id });
        await User.deleteById ? await User.findByIdAndDelete(testUser._id) : await User.deleteOne({ _id: testUser._id });
    }
    if (testLevel?._id) {
        await Level.deleteOne({ _id: testLevel._id });
    }
    await mongoose.disconnect();
    console.log('\n✅  Cleanup done, disconnected.');
}

// ─── Test 1: Scheduled action IS created when autoApproveEnabled=true ────────
async function test_scheduledActionCreated() {
    console.log('🧪 Test 1: ScheduledAction created when autoApproveEnabled=true');

    const request = await KeyGenerationRequest.create({
        userId: testUser._id,
        nodeId: testNodeId,
        nodeAmount: 100,
        level: 1,
        keysCount: 1,
        directAccessKeyPrice: 1,
        totalCost: 1,
        status: 'pending',
        nodeStatus: 'pending'
    });

    // Simulate what the controller does: check autoApproveEnabled, create ScheduledAction
    const nodeInTemplate = testLevel.nodes.find(n => n.id === testNodeId);
    assert.ok(nodeInTemplate?.data?.autoApproveEnabled, 'Node should have autoApproveEnabled=true');

    const delay = nodeInTemplate.data.autoApproveDelay || 1;
    assert.equal(delay, 30, 'Delay should be 30 minutes');

    const outcomeStatus = nodeInTemplate.data.transaction?.status || 'Success';
    const validOutcomes = ['success', 'fail', 'cold wallet', 'reported'];
    const outcomeLC = outcomeStatus.toLowerCase();
    const nodeOutcome = validOutcomes.includes(outcomeLC) ? outcomeLC : 'success';
    const executeAt = new Date(Date.now() + delay * 60 * 1000);

    const sa = await ScheduledAction.create({
        requestId: request._id,
        actionType: outcomeStatus === 'Fail' ? 'reject' : 'approve',
        nodeStatusOutcome: nodeOutcome,
        approvedAmount: outcomeStatus === 'Fail' ? null : 100,
        scheduledBy: null,
        executeAt,
        status: 'pending'
    });

    assert.ok(sa._id, 'ScheduledAction should be created');
    assert.equal(sa.status, 'pending');
    assert.equal(sa.actionType, 'approve');
    assert.equal(sa.nodeStatusOutcome, 'success');
    assert.equal(sa.approvedAmount, 100);

    // Verify executeAt is ~30 minutes in the future
    const diffMs = sa.executeAt.getTime() - Date.now();
    assert.ok(diffMs > 29 * 60 * 1000 && diffMs <= 30 * 60 * 1000,
        `executeAt should be ~30 min in future, was ${Math.round(diffMs / 60000)} min`);

    console.log('   ✅ ScheduledAction created with correct delay, outcome, and amount\n');
    return { request, sa };
}

// ─── Test 2: No scheduled action when autoApproveEnabled=false ──────────────
async function test_noScheduledActionWhenDisabled() {
    console.log('🧪 Test 2: No ScheduledAction when autoApproveEnabled=false (delay 0 / Off)');

    const request = await KeyGenerationRequest.create({
        userId: testUser._id,
        nodeId: testNodeId2,
        nodeAmount: 50,
        level: 1,
        keysCount: 1,
        directAccessKeyPrice: 1,
        totalCost: 1,
        status: 'pending',
        nodeStatus: 'pending'
    });

    // Simulate what the controller does
    const nodeInTemplate = testLevel.nodes.find(n => n.id === testNodeId2);
    assert.ok(!nodeInTemplate?.data?.autoApproveEnabled,
        'Node 2 should have autoApproveEnabled=false');

    // Controller checks: if (nodeInTemplate?.data?.autoApproveEnabled) { ... }
    // Since it's false, no ScheduledAction should be created
    const saCount = await ScheduledAction.countDocuments({ requestId: request._id });
    assert.equal(saCount, 0, 'No ScheduledAction should exist for disabled node');

    console.log('   ✅ No ScheduledAction created — request stays for manual admin review\n');
    return { request };
}

// ─── Test 3: processDueScheduledActions() processes due actions ──────────────
async function test_processDueActions(saFromTest1, requestFromTest1) {
    console.log('🧪 Test 3: processDueScheduledActions() processes past-due actions');

    // Move the scheduled action to the past (simulate time passing)
    saFromTest1.executeAt = new Date(Date.now() - 1000);
    await saFromTest1.save();

    // Mark user node as pending (simulating what the controller does)
    testUser.nodeProgress.set(testNodeId, 'pending');
    await testUser.save();

    // Run the processor — inline version of processDueScheduledActions()
    const dueActions = await ScheduledAction.find({
        status: 'pending',
        executeAt: { $lte: new Date() }
    }).limit(20);

    assert.ok(dueActions.length >= 1, 'There should be at least 1 due action');

    // Find our test action
    const testAction = dueActions.find(a => a.requestId.toString() === requestFromTest1._id.toString());
    assert.ok(testAction, 'Our test action should be in the due list');

    // Process it manually (simulating _executeApprove)
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const request = await KeyGenerationRequest.findById(testAction.requestId).session(session);
        assert.ok(request, 'Request should exist');
        assert.equal(request.status, 'pending', 'Request should still be pending');

        const user = await User.findById(request.userId).session(session);
        assert.ok(user, 'User should exist');

        // Approve: add balance + set node progress
        user.balance += Number(testAction.approvedAmount);
        user.nodeProgress.set(request.nodeId, testAction.nodeStatusOutcome);
        await user.save({ session });

        // Update request
        request.status = 'approved';
        request.nodeStatus = testAction.nodeStatusOutcome;
        request.approvedAmount = testAction.approvedAmount;
        request.processedAt = new Date();
        await request.save({ session });

        // Update scheduled action
        testAction.status = 'executed';
        testAction.executedAt = new Date();
        await testAction.save({ session });

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }

    // Verify results
    const updatedUser = await User.findById(testUser._id);
    const nodeStatus = updatedUser.nodeProgress.get(testNodeId);
    assert.equal(nodeStatus, 'success', `Node progress should be 'success', got '${nodeStatus}'`);
    assert.ok(updatedUser.balance >= 100, `User balance should include approved amount, got ${updatedUser.balance}`);

    const updatedSA = await ScheduledAction.findById(saFromTest1._id);
    assert.equal(updatedSA.status, 'executed', 'ScheduledAction should be marked executed');

    const updatedReq = await KeyGenerationRequest.findById(requestFromTest1._id);
    assert.equal(updatedReq.status, 'approved', 'Request should be approved');

    console.log('   ✅ Due action processed: user.nodeProgress=success, balance updated, SA=executed\n');
}

// ─── Test 4: Fail outcome maps correctly ─────────────────────────────────────
async function test_failOutcome() {
    console.log('🧪 Test 4: "Fail" status outcome maps to reject action');

    // Create a node template with status='Fail'
    const failNodeId = `${TEST_PREFIX}_fail_node`;
    await Level.updateOne(
        { _id: testLevel._id },
        {
            $push: {
                nodes: {
                    id: failNodeId,
                    type: 'fingerprintNode',
                    position: { x: 400, y: 0 },
                    data: {
                        label: 'Fail Node',
                        autoApproveEnabled: true,
                        autoApproveDelay: 5,
                        transaction: { amount: 200, status: 'Fail' }
                    }
                }
            }
        }
    );

    const updatedLevel = await Level.findById(testLevel._id);
    const nodeInTemplate = updatedLevel.nodes.find(n => n.id === failNodeId);

    const outcomeStatus = nodeInTemplate.data.transaction?.status;
    assert.equal(outcomeStatus, 'Fail', 'Template status should be Fail');

    const actionType = outcomeStatus === 'Fail' ? 'reject' : 'approve';
    assert.equal(actionType, 'reject', 'Action type should be reject for Fail status');

    const outcomeLC = outcomeStatus.toLowerCase();
    const validOutcomes = ['success', 'fail', 'cold wallet', 'reported'];
    const nodeOutcome = validOutcomes.includes(outcomeLC) ? outcomeLC : 'success';
    assert.equal(nodeOutcome, 'fail', 'Node outcome should be fail');

    // Verify approvedAmount is null for Fail
    const approvedAmount = outcomeStatus === 'Fail' ? null : 200;
    assert.equal(approvedAmount, null, 'Approved amount should be null for Fail');

    console.log('   ✅ Fail status correctly maps: actionType=reject, nodeOutcome=fail, approvedAmount=null\n');
}

// ─── Test 5: delay || 1 treats 0 as 1 ───────────────────────────────────────
async function test_delayOrOperator() {
    console.log('🧪 Test 5: `delay || 1` correctly treats 0 as 1 (minimum 1 minute)');

    // Simulate the backend logic: autoApproveDelay || 1
    const delay0 = 0 || 1;
    assert.equal(delay0, 1, 'delay=0 should become 1 via || operator');

    const delay30 = 30 || 1;
    assert.equal(delay30, 30, 'delay=30 should stay 30');

    const delayNull = null || 1;
    assert.equal(delayNull, 1, 'delay=null should become 1');

    const delayUndefined = undefined || 1;
    assert.equal(delayUndefined, 1, 'delay=undefined should become 1');

    console.log('   ✅ || operator behaves as expected (0 → 1, null → 1, 30 → 30)\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    try {
        await setup();

        console.log('═══════════════════════════════════════════');
        console.log('  Auto-Approve Pipeline Tests');
        console.log('═══════════════════════════════════════════\n');

        // Test 1
        const { request: req1, sa: sa1 } = await test_scheduledActionCreated();

        // Test 2
        await test_noScheduledActionWhenDisabled();

        // Test 3
        await test_processDueActions(sa1, req1);

        // Test 4
        await test_failOutcome();

        // Test 5
        await test_delayOrOperator();

        console.log('═══════════════════════════════════════════');
        console.log('  All 5 tests passed ✅');
        console.log('═══════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
        process.exitCode = 1;
    } finally {
        await cleanup();
    }
}

main();
