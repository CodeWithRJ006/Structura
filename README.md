# Structura

Razorpay's official MCP server has one access control: `--read-only`. Structura adds a deterministic policy layer with the one check no generic MCP gateway does — detecting when an agent splits a transaction across multiple calls to stay under a per-call limit.

## Verified Ground Truth
- The Razorpay MCP server provides 14 tools mapping to core payment APIs (payments, refunds, orders, customers).
- Security controls are binary: `--read-only` disables all mutating tools, or default mode allows unrestricted access.
- Hooks system (PR #89) allows custom headers but not payload inspection or call interception.
- Issue #134 requests native policy guardrails, validating the need for this layer.
- The competitive landscape consists of generic API gateways that cannot inspect inside JSON-RPC MCP frames or maintain cross-call memory for structuring detection.

## Upstream Contributions
To demonstrate that this proxy fills a very real gap in the ecosystem, I have pushed the insights from this architecture directly back upstream to the official Razorpay MCP server:
- **Fixing Issue #134 (Truncation Bug)**: [razorpay/razorpay-mcp-server/pull/140](https://github.com/razorpay/razorpay-mcp-server/pull/140). A PR fixing a silent fractional subunit truncation bug at the input boundary, ensuring precision integrity before the SDK boundary.
- **Native Policy Guardrails (The Core Gap)**: [razorpay/razorpay-mcp-server/discussions/141](https://github.com/razorpay/razorpay-mcp-server/discussions/141). A formal proposal for a `PolicyHook` interface, linking this repository as the reference architecture for why an in-process hook is necessary to avoid requiring an external `stdio` proxy wrapper.

## Architecture
Structura acts as a transparent `stdio` proxy that wraps the upstream Razorpay MCP Go binary.

```text
structura/
├── packages/
│   ├── proxy/         # The core stdio wrapper, policy engine, structuring detector, and SQLite DB
│   │   ├── src/
│   │   │   ├── proxy/         # Stdio Bridge (transparent raw-byte passthrough)
│   │   │   ├── policy/        # Deterministic rules evaluation (ALLOW/DENY/REQUIRE_APPROVAL)
│   │   │   ├── structuring/   # Cross-call state tracking (memory) and splitting detection
│   │   │   ├── approval/      # SQLite queue + HTTP API for human-in-the-loop approvals
│   │   │   ├── audit/         # Tamper-evident hash-chained audit log 
│   │   │   └── cli.ts         # `structura verify-audit-log` bin tool
│   ├── dashboard/     # React + Vite static UI for reviewing/approving pending actions
├── scripts/           # Acceptance and regression tests
├── policy.yaml        # Rules definition
└── structura.db       # SQLite DB (Approvals & Hash-chained Audit Log)
```

## ADR-style Decisions
1. **Deterministic-only policy path:** No LLM anywhere in the decision path. Fast, predictable, zero hallucination risk on security bounds.
2. **Fail-closed config loading:** If `policy.yaml` is missing or fails Zod schema validation, the proxy refuses to start.
3. **REQUIRE_APPROVAL for structuring flags:** Suspicious structuring limits trigger an approval queue rather than a hard `DENY`, avoiding false-positive deadlocks for legitimate burst traffic.
4. **In-memory-only structuring state for v1:** Rolling window memory lives in process state to avoid DB bottleneck during evaluation. 
5. **Raw-byte passthrough instead of re-serialization:** Avoids mangling JSON responses. The proxy intercepts via `id` correlation on stdout but does not parse the underlying payload.

## Failure-semantics
| Failure Mode | Result | Tested Behavior |
| --- | --- | --- |
| Malformed JSON-RPC frame | Passthrough | Ignored by policy engine, passed directly to upstream which returns proper `-32700 Parse error`. Proxy recovers instantly. |
| Missing/invalid policy.yaml | Fail Closed | Proxy refuses to boot on startup, stdout logs the error. |
| Upstream process crash mid-session | Teardown | Proxy monitors `process.on('exit')` and cleans up pipe bindings. |
| Double-approval attempt | Rejected | API returns HTTP 400. Proxy intercepts the injection attempt, resulting in no upstream S2S call. |
| Tampered/deleted audit log row | Detected | Standalone CLI catches content hashes, linkage mismatches, and `seq` gaps exactly at the point of corruption. |

## Adversarial Test Results
- **True Positive:** 5x ₹10,000 refunds against one `payment_id` successfully flagged on the 2nd call.
- **False Positive:** 5x ₹10,000 refunds against 5 different `payment_ids` successfully allowed.
- **Cross-key Evasion:** (Known Limitation / Incidental Catch) Detection groups by `payment_id` regardless of API key. Cross-key splitting targeting the same payment is caught, but it is incidental to the group key, not explicit API key tracking.
- **Window-boundary Evasion:** (Known Limitation) Calls explicitly spaced out right outside the 24h rolling fixed window evade detection.
- **Audit Log Tamper - Content:** Caught content hash mismatch at `seq 2`.
- **Audit Log Tamper - Row Deletion:** Caught `seq` gap at `seq 2`.
- **Audit Log Tamper - Smart Attacker:** Caught broken linkage hash at `seq 3` when attacker manually recomputed the hash of tampered `seq 2` without rewriting the rest of the chain.

## Live Deployment
The proxy and dashboard are currently live on a Render free-tier Web Service at:
**https://structura-mlsv.onrender.com**

## Production Gaps & Protocol Constraints
- **Heuristic Ceilings on Structuring Detection:** While migrating from a fixed-window to a sliding-window reduces trivial boundary evasion, rule-based detection inherently hits a ceiling. A patient adversary can always pace transactions under the threshold. True resolution requires moving from single-signal rules to clustering analysis (counterparty diversity, velocity) and anomaly scoring.
- **State Fragmentation vs. Availability Tradeoffs:** The proxy currently uses an in-memory `Map` for structuring counters. Scaling horizontally requires an external store like Redis. However, introducing Redis introduces a critical availability question for a security control plane: if Redis is unreachable, the system must **fail closed** (deny/hold), explicitly prioritizing security over availability.
- **The "Dangling State" MCP Protocol Limitation:** MCP is strictly synchronous per-call over `stdio`, lacking a native push channel. When a tool hits `REQUIRE_APPROVAL`, the agent receives an immediate failure. The standard workaround within MCP constraints is a **status-poll tool**—giving the agent a ticket ID to query asynchronously, rather than treating this as a proxy bug.
- **Tamper-Evident vs. Tamper-Proof:** The SQLite hash-chain mathematically catches row tampering or deletion. However, an attacker with full filesystem access can drop the table and rewrite history entirely. The pragmatic V2 fix short of full blockchain anchoring is periodically publishing hash checkpoints to an external append-only store (e.g., an S3 bucket with Object Lock or a signed git commit).
- **Free-tier deployment's disk persistence:** The Render free-tier Web Service does not support attaching persistent disks (Volumes). This means `structura.db` operates on an ephemeral filesystem and the audit log / approval queue will be wiped on every container restart or sleep cycle.

## Setup / running locally
```bash
# Clone the repository
git clone https://github.com/CodeWithRJ006/Structura.git
cd Structura

# Configure env vars
echo "RZP_KEY_ID=mock" > .env
echo "RZP_KEY_SECRET=mock" >> .env
echo "RZP_TOOLSETS=payments,refunds" >> .env

# Start with Docker Compose
docker compose up --build
```
The Dashboard will be reachable at `http://localhost:4000`.

## Roadmap (v2)
- Multi-merchant SaaS console
- AP2/UAP mandate ingestion
- ML anomaly scoring
