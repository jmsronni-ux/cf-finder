import React, { useState, useEffect, useRef } from 'react';

// ─── Fake terminal lines pool ───
// Long, narrative lines that tell a story of recovering crypto from a compromised wallet.
// All "variable" values are randomised on each generation so they never repeat identically.

interface TerminalSegment {
  text: string;
  color?: string;
}

interface TerminalLine {
  prefix?: string;
  prefixColor?: string;
  segments: TerminalSegment[];
}

// ── Random-value helpers ──────────────────────────────────────────────
const rInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const rHex = (len: number) =>
  Array.from({ length: len }, () =>
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('');

const rAddr = () => `0x${rHex(4)}…${rHex(4)}`;

const rIp = () =>
  `${rInt(10, 220)}.${rInt(1, 255)}.xx.xx:${[8333, 8443, 9735, 443, 30303][rInt(0, 4)]}`;

const rSession = () => `sess_${rHex(8)}`;

const rBlock = (base = 800_000) => {
  const n = base + rInt(1_000, 50_000);
  return `#${n.toLocaleString('en-US')}`;
};

const rBlockRange = (base = 800_000) => {
  const a = base + rInt(1_000, 40_000);
  const b = a + rInt(200, 5_000);
  return `${('#' + a.toLocaleString('en-US'))} → ${('#' + b.toLocaleString('en-US'))}`;
};

const rMem = () => `${[64, 128, 192, 256, 384, 512][rInt(0, 5)]} MB`;

const rLatency = () => `${rInt(8, 120)}ms`;

const rConfidence = () => `${(90 + Math.random() * 9.5).toFixed(1)}%`;

const rOracleConf = () => `0.${rInt(91, 99)}`;

const rVersion = () => `v${rInt(3, 5)}.${rInt(0, 9)}.${rInt(0, 9)}-rc${rInt(1, 9)}`;

const rProtoVer = () => `v${rInt(70010, 70020)}`;

const rThreads = () => `${rInt(4, 12)}`;

const rPendingTasks = () => `${rInt(6, 32)}`;

const rTxCount = () => {
  const n = rInt(800, 9_999);
  return n.toLocaleString('en-US');
};

const rOutgoing = () => `${rInt(18, 120)}`;

const rHops = () => `${rInt(2, 7)}`;

const rDerived = () => `${rInt(6, 30)}`;

const rUtxoCount = () => `${rInt(10, 60)}`;

const rAddrCount = () => `${rInt(4, 18)}`;

const rValidators = () => {
  const total = rInt(5, 9);
  const ack = total - rInt(0, 1);
  return { total, ack };
};

const rPeers = () => `${rInt(4, 16)}`;

const rBlocks = () => `${rInt(1, 4)}`;

const rMinutes = () => `${rInt(8, 40)}`;

const rHeapUsed = (total: string) => {
  const totalNum = parseInt(total);
  const used = (totalNum * (0.55 + Math.random() * 0.35)).toFixed(1);
  return `${used} MB / ${total}`;
};

const rFreed = () => `${(5 + Math.random() * 25).toFixed(1)} MB`;

const rStaleConns = () => `${rInt(2, 10)}`;

const rErrorFreeSeconds = () => `${rInt(30, 600)}`;

const rBtcAmount = () => `${(Math.random() * 2.5 + 0.01).toFixed(2)} BTC`;

const rTaggedAddresses = () => `${(Math.random() * 3 + 0.5).toFixed(1)}M`;

const rConfirmations = () => `${rInt(3, 20)}+`;

const rShardNum = () => `#${rInt(1, 64)}`;

const rTtl = () => `${[30, 45, 60, 90, 120][rInt(0, 4)]}s`;

const rDepth = () => `${rInt(3, 8)}`;

const rBranch = () => `${rInt(2, 5)}`;

const rOutputs = () => `${rInt(2, 8)}`;

const rScryptN = () => `2^${rInt(12, 18)}`;

const rGraphNodes = () => rTxCount();

const rGraphEdges = (nodes: string) => {
  const n = parseInt(nodes.replace(/,/g, ''));
  return (n * 2).toLocaleString('en-US');
};

const rCipher = () =>
  ['AES-256-GCM', 'CHACHA20-POLY1305', 'AES-128-GCM'][rInt(0, 2)];

const rHashAlgo = () =>
  ['SHA3-256', 'BLAKE2b', 'Keccak-256', 'SHA-256'][rInt(0, 3)];

const rKeyBits = () => `${[128, 192, 256, 384][rInt(0, 3)]}-bit`;

// ── Generate a fresh pool with randomised values ──────────────────────
function generateLinesPool(): TerminalLine[] {
  const mem = rMem();
  const txCount = rTxCount();
  const outgoing = rOutgoing();
  const derived = rDerived();
  const utxoCount = rUtxoCount();
  const addrCount = rAddrCount();
  const validators = rValidators();
  const graphNodes = rGraphNodes();
  const blockStart = rBlock();
  const blockEnd = rBlock(830_000);

  return [
    {
      prefix: '[INIT]', prefixColor: 'text-cyan-400', segments: [
        { text: 'Bootstrapping recovery engine ', color: 'text-neutral-400' },
        { text: rVersion(), color: 'text-cyan-300' },
        { text: ' — loading chain synchronisation modules and wallet introspection drivers…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[INIT]', prefixColor: 'text-cyan-400', segments: [
        { text: 'Spawning ', color: 'text-neutral-400' },
        { text: `${rThreads()} parallel resolver threads`, color: 'text-amber-300' },
        { text: ' for concurrent path reconstruction across multiple blockchain shards…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[SYS]', prefixColor: 'text-neutral-500', segments: [
        { text: 'Loading serialised state from last checkpoint — recovery session ', color: 'text-neutral-500' },
        { text: rSession(), color: 'text-violet-400' },
        { text: ` restored successfully with ${rPendingTasks()} pending sub-tasks`, color: 'text-neutral-500' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Engine initialised — all modules loaded, memory pool allocated (', color: 'text-neutral-400' },
        { text: mem, color: 'text-emerald-300' },
        { text: '), ready to begin scanning the target address space', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[NET]', prefixColor: 'text-blue-400', segments: [
        { text: 'Establishing encrypted tunnel to blockchain relay node at ', color: 'text-neutral-400' },
        { text: rIp(), color: 'text-sky-400' },
        { text: ' — TLS 1.3 handshake in progress…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Tunnel established — round-trip latency ', color: 'text-neutral-400' },
        { text: rLatency(), color: 'text-emerald-300' },
        { text: ', connection encrypted with ', color: 'text-neutral-400' },
        { text: rCipher(), color: 'text-amber-300' },
        { text: ' cipher suite', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[NET]', prefixColor: 'text-blue-400', segments: [
        { text: 'Connecting to secondary archive node for historical block data — peer ', color: 'text-neutral-400' },
        { text: rIp(), color: 'text-sky-400' },
        { text: ' protocol version ', color: 'text-neutral-400' },
        { text: rProtoVer(), color: 'text-sky-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Peer handshake complete — full node verified, chain height ', color: 'text-neutral-400' },
        { text: rBlock(830_000), color: 'text-emerald-300' },
        { text: ' synchronised and ready for query', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[SCAN]', prefixColor: 'text-sky-400', segments: [
        { text: 'Beginning deep scan of compromised wallet — enumerating all outgoing transactions from address ', color: 'text-neutral-400' },
        { text: rAddr(), color: 'text-purple-400' },
        { text: ' since block ', color: 'text-neutral-400' },
        { text: blockStart, color: 'text-sky-300' },
      ]
    },
    {
      prefix: '[SCAN]', prefixColor: 'text-sky-400', segments: [
        { text: 'Identified ', color: 'text-neutral-400' },
        { text: `${outgoing} outgoing transfers`, color: 'text-amber-400' },
        { text: ' from target wallet — analysing each destination for further fund movement and mixing patterns…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[TRACE]', prefixColor: 'text-violet-400', segments: [
        { text: 'Tracing funds through ', color: 'text-neutral-400' },
        { text: `${rHops()} intermediate hops`, color: 'text-amber-300' },
        { text: ' — attacker routed funds via a smart contract mixer at ', color: 'text-neutral-400' },
        { text: rAddr(), color: 'text-red-400' },
      ]
    },
    {
      prefix: '[TRACE]', prefixColor: 'text-violet-400', segments: [
        { text: 'Unwinding mixer outputs — cross-referencing input/output amounts to isolate tainted UTXO set across ', color: 'text-neutral-400' },
        { text: `${derived} derived addresses`, color: 'text-amber-300' },
      ]
    },
    {
      prefix: '[DATA]', prefixColor: 'text-teal-400', segments: [
        { text: 'Downloading and deserialising witness data for ', color: 'text-neutral-400' },
        { text: `${txCount} transactions`, color: 'text-teal-300' },
        { text: ' across the suspected path — this may take a few moments…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Witness data fully parsed — ', color: 'text-neutral-400' },
        { text: `${rConfidence()} confidence`, color: 'text-emerald-300' },
        { text: ' match on fund trail through blocks ', color: 'text-neutral-400' },
        { text: rBlockRange(), color: 'text-sky-400' },
      ]
    },
    {
      prefix: '[KEY]', prefixColor: 'text-amber-400', segments: [
        { text: 'Deriving access key using ', color: 'text-neutral-400' },
        { text: `scrypt(N=${rScryptN()}, r=8, p=1)`, color: 'text-amber-300' },
        { text: ' — computing key material from wallet fingerprint and session entropy…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[AUTH]', prefixColor: 'text-amber-400', segments: [
        { text: 'Validating generated key signature against the on-chain ledger record — verifying ownership proof for recovery authorization…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Cryptographic signature verified ', color: 'text-neutral-400' },
        { text: '✓', color: 'text-emerald-400' },
        { text: ' — access key is valid for the target wallet recovery scope', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[KEY]', prefixColor: 'text-amber-400', segments: [
        { text: 'Rotating ephemeral session key to prevent replay attacks — new session token generated with ', color: 'text-neutral-400' },
        { text: rKeyBits(), color: 'text-amber-300' },
        { text: ' entropy from hardware RNG', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[VERIFY]', prefixColor: 'text-violet-400', segments: [
        { text: 'Running Merkle proof verification against block ', color: 'text-neutral-400' },
        { text: blockEnd, color: 'text-sky-400' },
        { text: ' — validating that recovered transaction hashes belong to the canonical chain…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Merkle root valid ', color: 'text-neutral-400' },
        { text: '✓', color: 'text-emerald-400' },
        { text: ` — all ${outgoing} transaction inclusion proofs confirmed against header `, color: 'text-neutral-400' },
        { text: rAddr(), color: 'text-purple-400' },
      ]
    },
    {
      prefix: '[HASH]', prefixColor: 'text-orange-400', segments: [
        { text: 'Recomputing full wallet fingerprint using ', color: 'text-neutral-400' },
        { text: rHashAlgo(), color: 'text-purple-400' },
        { text: ' over the reconstructed transaction graph to verify integrity of the recovery path…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Fingerprint hash matched — recovery path integrity confirmed with digest ', color: 'text-neutral-400' },
        { text: `${rHex(6)}…${rHex(4)}`, color: 'text-emerald-300' },
      ]
    },
    {
      prefix: '[NET]', prefixColor: 'text-blue-400', segments: [
        { text: 'Querying recovery oracle service for independent validation of the reconstructed fund path — awaiting external confirmation…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Oracle response received: ', color: 'text-neutral-400' },
        { text: 'path_valid=true', color: 'text-emerald-300' },
        { text: ', ', color: 'text-neutral-400' },
        { text: `confidence=${rOracleConf()}`, color: 'text-emerald-300' },
        { text: ' — external verification passed', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[SYNC]', prefixColor: 'text-cyan-400', segments: [
        { text: 'Broadcasting recovery state to distributed cluster — waiting for quorum acknowledgement from ', color: 'text-neutral-400' },
        { text: `${validators.total} validator nodes`, color: 'text-cyan-300' },
        { text: '…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Cluster quorum reached ', color: 'text-neutral-400' },
        { text: `(${validators.ack}/${validators.total} ack)`, color: 'text-sky-400' },
        { text: ' — consensus achieved on recovery state, proceeding to fund extraction phase', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[SCAN]', prefixColor: 'text-sky-400', segments: [
        { text: 'Inspecting current mempool for any pending transactions from the attacker address that could conflict with the recovery operation…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: '0 conflicting transactions detected in mempool — the recovery window is clear, no competing spends found', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[DATA]', prefixColor: 'text-teal-400', segments: [
        { text: 'Enumerating unspent transaction outputs (UTXO) for all ', color: 'text-neutral-400' },
        { text: `${derived} derived addresses`, color: 'text-teal-300' },
        { text: ' — calculating total recoverable balance…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'UTXO set fully enumerated — ', color: 'text-neutral-400' },
        { text: `${utxoCount} unspent outputs`, color: 'text-emerald-300' },
        { text: ` identified across ${addrCount} addresses with non-zero recoverable balances`, color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[LOCK]', prefixColor: 'text-red-400', segments: [
        { text: 'Acquiring distributed lock on recovery shard ', color: 'text-neutral-400' },
        { text: rShardNum(), color: 'text-red-300' },
        { text: ' to prevent concurrent modification during the extraction phase — TTL ', color: 'text-neutral-400' },
        { text: rTtl(), color: 'text-amber-300' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Shard lock acquired — exclusive write access confirmed, proceeding with checkpoint write to write-ahead log', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[COMMIT]', prefixColor: 'text-emerald-400', segments: [
        { text: `Writing recovery checkpoint to WAL — serialising current state including ${outgoing} traced transactions and ${utxoCount} target UTXOs for crash recovery…`, color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Checkpoint committed — recovery state persisted to durable storage, safe to proceed with fund extraction sequence', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[TRACE]', prefixColor: 'text-violet-400', segments: [
        { text: 'Reconstructing the complete transaction path from compromised wallet to current holding addresses — resolving ', color: 'text-neutral-400' },
        { text: `depth=${rDepth()}`, color: 'text-amber-300' },
        { text: ' with branch factor ', color: 'text-neutral-400' },
        { text: rBranch(), color: 'text-amber-300' },
      ]
    },
    {
      prefix: '[TRACE]', prefixColor: 'text-violet-400', segments: [
        { text: 'Found forwarding chain: attacker split funds into ', color: 'text-neutral-400' },
        { text: `${rOutputs()} equal outputs`, color: 'text-amber-400' },
        { text: ` at hop ${rInt(1, 3)}, then recombined at hop ${rInt(3, 6)} through a consolidation address — classic peel chain pattern`, color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[LINK]', prefixColor: 'text-pink-400', segments: [
        { text: 'Cross-referencing adjacent graph nodes to identify known exchange deposit addresses within the fund trail — checking against ', color: 'text-neutral-400' },
        { text: `${rTaggedAddresses()} tagged addresses`, color: 'text-pink-300' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Match found — funds partially routed through exchange hot wallet ', color: 'text-neutral-400' },
        { text: rAddr(), color: 'text-purple-400' },
        { text: ', flagging for coordinated recovery with exchange compliance team', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[TRACE]', prefixColor: 'text-violet-400', segments: [
        { text: 'Backtracking to decision fork at depth 2 — exploring alternative branch where ', color: 'text-neutral-400' },
        { text: rBtcAmount(), color: 'text-amber-400' },
        { text: ' was sent to an untagged cold storage address…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[DATA]', prefixColor: 'text-teal-400', segments: [
        { text: 'Fetching full block data for range ', color: 'text-neutral-400' },
        { text: rBlockRange(825_000), color: 'text-sky-400' },
        { text: ' from archive node — extracting all transactions involving suspected attacker addresses…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[MEM]', prefixColor: 'text-neutral-500', segments: [
        { text: 'Current heap usage: ', color: 'text-neutral-500' },
        { text: rHeapUsed(mem.split(' ')[0]), color: 'text-neutral-400' },
        { text: ` — transaction graph serialised with ${graphNodes} nodes and ${rGraphEdges(graphNodes)} edges in working memory`, color: 'text-neutral-500' },
      ]
    },
    {
      prefix: '[GC]', prefixColor: 'text-neutral-500', segments: [
        { text: `Releasing ${rStaleConns()} stale peer connections and flushing expired cache entries — freed `, color: 'text-neutral-500' },
        { text: rFreed(), color: 'text-neutral-400' },
        { text: ' of memory for continued processing', color: 'text-neutral-500' },
      ]
    },
    {
      prefix: '[HEALTH]', prefixColor: 'text-lime-400', segments: [
        { text: 'All subsystems nominal ', color: 'text-neutral-400' },
        { text: '●', color: 'text-emerald-400' },
        { text: ` — resolver threads active, network connections stable, no errors in last ${rErrorFreeSeconds()} seconds`, color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[SCAN]', prefixColor: 'text-sky-400', segments: [
        { text: 'Running heuristic clustering analysis on transaction outputs to identify change addresses controlled by the attacker — applying common-input-ownership assumption…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Clustering complete — identified ', color: 'text-neutral-400' },
        { text: `${rInt(4, 18)} probable change addresses`, color: 'text-emerald-300' },
        { text: ' linked to the original compromised wallet with ', color: 'text-neutral-400' },
        { text: `${rConfidence()} confidence`, color: 'text-emerald-300' },
      ]
    },
    {
      prefix: '[DATA]', prefixColor: 'text-teal-400', segments: [
        { text: 'Pulling historical price data for recovery valuation — converting all traced amounts to USD at time-of-transaction rates for accurate reporting…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[VERIFY]', prefixColor: 'text-violet-400', segments: [
        { text: 'Performing double-spend safety check — ensuring none of the target UTXOs have been included in any competing blocks or chain reorganisations…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[OK]', prefixColor: 'text-emerald-400', segments: [
        { text: 'Double-spend check passed ', color: 'text-neutral-400' },
        { text: '✓', color: 'text-emerald-400' },
        { text: ' — all target outputs exist on the canonical chain with ', color: 'text-neutral-400' },
        { text: `${rConfirmations()} confirmations`, color: 'text-emerald-300' },
      ]
    },
    {
      prefix: '[KEY]', prefixColor: 'text-amber-400', segments: [
        { text: 'Generating recovery transaction payload — constructing multi-input spend from ', color: 'text-neutral-400' },
        { text: `${utxoCount} UTXOs`, color: 'text-amber-300' },
        { text: ' with optimised fee estimation for next-block inclusion…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[NET]', prefixColor: 'text-blue-400', segments: [
        { text: 'Submitting signed recovery transaction to broadcast relay — propagating to ', color: 'text-neutral-400' },
        { text: `${rPeers()} connected peers`, color: 'text-sky-400' },
        { text: ' for network-wide dissemination…', color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[SYNC]', prefixColor: 'text-cyan-400', segments: [
        { text: 'Monitoring mempool for transaction inclusion — watching for confirmation in upcoming blocks, estimated wait ', color: 'text-neutral-400' },
        { text: `~${rBlocks()} blocks`, color: 'text-cyan-300' },
        { text: ` (~${rMinutes()} minutes)`, color: 'text-neutral-400' },
      ]
    },
    {
      prefix: '[COMMIT]', prefixColor: 'text-emerald-400', segments: [
        { text: `Updating recovery progress ledger — marking ${utxoCount} UTXOs as claimed, logging transaction hash for audit trail and compliance records…`, color: 'text-neutral-400' },
      ]
    },
  ];
}

// Shuffle helper
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface DisplayedLine {
  id: number;
  line: TerminalLine;
  typedLength: number;
  fullText: string;
}

// ── Stable config (outside component to avoid re-render issues) ──
const TYPE_SPEED_MIN = 30;
const TYPE_SPEED_MAX = 70;
const LINE_PAUSE_MIN = 1500;
const LINE_PAUSE_MAX = 3500;
const MAX_VISIBLE_LINES = 50;

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const FakeTerminal: React.FC = () => {
  const [lines, setLines] = useState<DisplayedLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineIdRef = useRef(0);

  useEffect(() => {
    cancelledRef.current = false;
    let pool = shuffle(generateLinesPool());
    let poolIndex = 0;

    const getNextLine = (): TerminalLine => {
      if (poolIndex >= pool.length) {
        // Regenerate with fresh random values and reshuffle
        pool = shuffle(generateLinesPool());
        poolIndex = 0;
      }
      return pool[poolIndex++];
    };

    const getFullText = (line: TerminalLine) =>
      line.segments.map(s => s.text).join('');

    // Pre-fill with already-completed lines so it never looks freshly started
    const prefillCount = randomBetween(5, 8);
    const prefilled: DisplayedLine[] = [];
    for (let i = 0; i < prefillCount; i++) {
      const line = getNextLine();
      const fullText = getFullText(line);
      const id = ++lineIdRef.current;
      prefilled.push({ id, line, typedLength: fullText.length, fullText });
    }
    setLines(prefilled);

    const wait = (ms: number) =>
      new Promise<void>(resolve => {
        timeoutRef.current = setTimeout(resolve, ms);
      });

    const typeLine = (line: TerminalLine): Promise<void> => {
      return new Promise(resolve => {
        const fullText = getFullText(line);
        const totalChars = fullText.length;
        const id = ++lineIdRef.current;

        // Add line with 0 typed chars
        setLines(prev => {
          const updated = [...prev, { id, line, typedLength: 0, fullText }];
          if (updated.length > MAX_VISIBLE_LINES) {
            return updated.slice(updated.length - MAX_VISIBLE_LINES);
          }
          return updated;
        });

        let charIdx = 0;

        const typeNext = () => {
          if (cancelledRef.current) { resolve(); return; }
          if (charIdx >= totalChars) { resolve(); return; }

          charIdx++;
          const currentCharIdx = charIdx;
          setLines(prev =>
            prev.map(dl =>
              dl.id === id ? { ...dl, typedLength: currentCharIdx } : dl
            )
          );

          const delay = randomBetween(TYPE_SPEED_MIN, TYPE_SPEED_MAX);
          timeoutRef.current = setTimeout(typeNext, delay);
        };

        // slight initial pause before typing starts
        timeoutRef.current = setTimeout(typeNext, 80);
      });
    };

    const loop = async () => {
      while (!cancelledRef.current) {
        const line = getNextLine();
        await typeLine(line);
        if (cancelledRef.current) break;
        await wait(randomBetween(LINE_PAUSE_MIN, LINE_PAUSE_MAX));
      }
    };

    loop();

    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // ← stable: no dependencies, runs once

  // Auto-scroll only if user hasn't scrolled up manually
  const isUserScrollingRef = useRef(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrollingRef.current = distanceFromBottom > 40;
  };

  useEffect(() => {
    if (scrollRef.current && !isUserScrollingRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Render visible text with colours
  const renderSegments = (dl: DisplayedLine) => {
    let remaining = dl.typedLength;
    const parts: React.ReactNode[] = [];
    for (let i = 0; i < dl.line.segments.length && remaining > 0; i++) {
      const seg = dl.line.segments[i];
      const take = Math.min(remaining, seg.text.length);
      parts.push(
        <span key={i} className={seg.color || 'text-neutral-300'}>
          {seg.text.slice(0, take)}
        </span>
      );
      remaining -= take;
    }
    return parts;
  };

  const lastLine = lines.length > 0 ? lines[lines.length - 1] : null;
  const isLastTyping = lastLine ? lastLine.typedLength < lastLine.fullText.length : false;

  return (
    <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-[#050505]">
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="w-2 h-2 rounded-full bg-red-500/60" />
        <div className="w-2 h-2 rounded-full bg-amber-500/60" />
        <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
        <span className="ml-2 text-[9px] text-neutral-600 font-mono tracking-wider uppercase select-none">
          terminal
        </span>
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="p-2.5 font-mono text-[10px] leading-[1.7] overflow-y-auto overflow-x-hidden"
        style={{ height: 200 }}
      >
        {lines.map((dl, i) => (
          <div key={dl.id} className="whitespace-pre-wrap break-all mb-0.5">
            {dl.line.prefix && (
              <span className={`${dl.line.prefixColor || 'text-neutral-500'} mr-1.5 select-none`}>
                {dl.line.prefix}
              </span>
            )}
            {renderSegments(dl)}
            {/* Blinking cursor on the currently-typing line */}
            {i === lines.length - 1 && isLastTyping && (
              <span className="inline-block w-[5px] h-[11px] bg-amber-400/80 ml-[1px] align-middle animate-pulse" />
            )}
          </div>
        ))}
        {/* Idle cursor between lines */}
        {lastLine && !isLastTyping && (
          <div>
            <span className="inline-block w-[5px] h-[11px] bg-amber-400/80 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FakeTerminal;
