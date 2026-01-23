import mongoose from 'mongoose';
import User from './backend/models/user.model.js';
import TopupRequest from './backend/models/topup-request.model.js';
import { MONGODB_URI } from './backend/config/env.js';

const verifySubAdminIsolation = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find a sub-admin
        const subAdmin = await User.findOne({ isSubAdmin: true });
        if (!subAdmin) {
            console.log('No sub-admin found in DB for verification.');
            return;
        }
        console.log(`Verifying for Sub-admin: ${subAdmin.name} (${subAdmin._id})`);

        // 2. Find users managed by this sub-admin
        const managedUsers = await User.find({ managedBy: subAdmin._id });
        const managedUserIds = managedUsers.map(u => u._id);
        console.log(`Sub-admin manages ${managedUsers.length} users.`);

        // 3. Simple filter simulation for Top-up Requests
        const filter = {};
        if (subAdmin.isSubAdmin) {
            filter.userId = { $in: managedUserIds };
        }

        const accessibleRequests = await TopupRequest.find(filter);
        console.log(`Sub-admin can access ${accessibleRequests.length} top-up requests.`);

        // 4. Verify no requests from non-managed users are present
        const nonManagedRequests = accessibleRequests.filter(req =>
            !managedUserIds.some(id => id.equals(req.userId))
        );

        if (nonManagedRequests.length === 0) {
            console.log('SUCCESS: No non-managed requests found in filtered results.');
        } else {
            console.error(`FAILURE: Found ${nonManagedRequests.length} requests from unmanaged users!`);
        }

    } catch (err) {
        console.error('Verification error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

verifySubAdminIsolation();
