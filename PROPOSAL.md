# ShadowPass — Product Proposal & Architecture Specification

[![Midnight Network: Preprod](https://img.shields.io/badge/Midnight-Preprod-22c55e?logo=midnight&logoColor=white)](https://preprod.midnightexplorer.com/contracts/0xf58d3e681578fff354e5391111b384f5dca9f39c9d567bdcf9fff84727ae8f56)
[![ShadowPass CI/CD](https://github.com/abhishek86038/Shadow-pass/actions/workflows/ci.yml/badge.svg)](https://github.com/abhishek86038/Shadow-pass/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 1. Executive Summary

**ShadowPass** is a privacy-first, zero-knowledge allowlist access protocol engineered on the **Midnight blockchain** using the **Compact** smart contract language and official Midnight.js contract bindings.

Traditional allowlist gating mechanisms in web3 (token presales, gated NFT mints, private DAO votes, and enterprise credential access) force users to reveal their public wallet addresses on a transparent blockchain. This exposes their complete transaction history, asset portfolio, and real-world links to the public. 

ShadowPass eliminates this privacy leak entirely. By leveraging Midnight's native private state architecture, Merkle membership proofs, and zero-knowledge circuit execution (`checkAccess()`), users prove they are authorized members of an allowlist without revealing:
- Their secret key
- Their wallet address
- Their position in the Merkle tree (leaf index or sibling path)
- Any identifying metadata

Upon successful on-chain proof verification, the public ledger updates the authorization counter and records a deterministic nullifier to prevent double-spending/replay attacks—achieving uncompromising access control with absolute cryptographic privacy.

---

## 2. Problem Statement: The Privacy Flaw in Transparent Blockchains

In Ethereum, Solana, and EVM-compatible ecosystems, access gating typically relies on one of three flawed paradigms:

1. **On-Chain Address Storage (`mapping(address => bool)`):**  
   Every allowed wallet address is publicly visible in contract storage. Any observer can scrape the allowlist, deanonymize holders, and execute targeted phishing or sandwich attacks.
2. **Public ECDSA / Ed25519 Signature Verification (`ecrecover`):**  
   The user submits a signed message from an admin. When the user executes the transaction, their wallet address and the signature are published to the mempool and ledger, linking their wallet to the allowlist entry.
3. **Public Merkle Proofs on EVM:**  
   The user sends their raw leaf address and Merkle sibling path in transaction `calldata`. The leaf is publicly revealed during execution, destroying anonymity at the exact moment access is claimed.

**The Core Dilemma:** On transparent blockchains, users are forced to choose between *verifiable access* and *personal financial privacy*.

---

## 3. Proposed Solution: The ShadowPass Protocol

ShadowPass replaces transparent address lists with cryptographic identity commitments verified entirely inside zero-knowledge circuits on Midnight:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 1. COMMITMENT PHASE                                    │
│                                                                                        │
│   User Secret Key (sk) ────────► leaf = leafOf(sk) = persistentHash(sk, 0)             │
│                                           │                                            │
│                                           ▼                                            │
│   Issuer/Admin constructs Merkle Tree ──► allowlistRoot = merkleRootFrom(leaf, path)   │
│                                           │                                            │
│                                           ▼                                            │
│   Issuer deploys / registers allowlistRoot on Midnight Preprod Public Ledger           │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              2. PRIVATE PROOF PHASE                                    │
│                                                                                        │
│   User Client (Secure Witness Provider):                                               │
│     - secretKey: Uint8Array<32>                                                        │
│     - merklePath: 5-depth sibling array [32 bytes x 5]                                 │
│     - pathDirections: boolean array [5 bits]                                           │
│                                           │                                            │
│                                           ▼                                            │
│   Compact ZK Circuit (checkAccess):                                                    │
│     - Reconstructs Merkle root: merkleRootFrom(leafOf(sk), path, dirs)                 │
│     - Asserts: calculatedRoot == allowlistRoot                                         │
│     - Derives: nullifier = persistentHash(sk, 1)                                       │
│     - Asserts: nullifiers.member(nullifier) == false                                   │
│     - State Transition: nullifiers.insert(nullifier); accessGranted += 1;              │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              3. PUBLIC LEDGER RESULT                                   │
│                                                                                        │
│   Midnight Public State:                                                               │
│     - allowlistRoot: 0x82f01... (Committed Merkle Root)                                │
│     - accessGranted: N + 1      (Public Authorization Increment)                       │
│     - nullifiers: { 0x39a1... } (Spent Nullifier Set — Prevents Replay)                │
│                                                                                        │
│   * Zero Knowledge Leaked: No secret key, leaf index, or wallet identity exposed.     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Why Midnight's Privacy Model is Essential

Midnight's architecture provides unique primitives that make ShadowPass possible:

| Feature | EVM / Transparent Chains | Midnight Network (ShadowPass) |
| :--- | :--- | :--- |
| **State Separation** | Monolithic public state only | Bifurcated **Public Ledger State** + **Private Witness Context** |
| **Proof Generation** | Costly off-chain snarkjs or zk-SNARK verifier contracts with high gas | Native **Compact** compiler generating WASM client provers and on-chain verification circuits |
| **Witness Secrecy** | User calldata is visible in mempool | Private witness variables (`secretKey`, `merklePath`) are evaluated locally inside the ZK proof engine and never transmitted |
| **Anti-Replay / Nullifiers** | Transparent nonce or address mappings | Disclosed cryptographic nullifiers (`persistentHash(sk, 1)`) that conceal the underlying secret key |
| **Wallet Integration** | Exposes signing address | Official **Midnight DApp Connector API** (`@midnight-ntwrk/dapp-connector-api`) separating transaction balance/fee payment from proof witness |

---

## 5. Circuit Specification & Compact Implementation

The core contract logic is implemented in [`contract/allowlist.compact`](file:///contract/allowlist.compact):

```compact
export ledger allowlistRoot: Bytes<32>;
export ledger accessGranted: Counter;
export ledger issuer: ZswapCoinPublicKey;
export ledger nullifiers: Set<Bytes<32>>;

witness secretKey(): Bytes<32>;
witness merklePath(): Vector<5, Bytes<32>>;
witness pathDirections(): Vector<5, Boolean>;

export circuit checkAccess(): [] {
    // 1. Fetch private witness inputs
    val sk = secretKey();
    val path = merklePath();
    val dirs = pathDirections();

    // 2. Derive blinded leaf commitment and nullifier
    val leaf = leafOf(sk);
    val nullifier = persistentHash<Bytes<32>, Bytes<32>>(sk, 1 as Bytes<32>);

    // 3. Verify membership in the committed allowlist root
    val computedRoot = merkleRootFrom(leaf, path, dirs);
    assert(computedRoot == allowlistRoot, "Prover leaf is not a valid member of the allowlist Merkle root");

    // 4. Enforce anti-replay (nullifier freshness)
    assert(!nullifiers.member(disclose(nullifier)), "Nullifier already spent: access has already been claimed");

    // 5. Update public ledger state
    nullifiers.insert(disclose(nullifier));
    accessGranted.increment(1);
}
```

---

## 6. Threat Model & Security Analysis

### 6.1 Unauthorized Access (Soundness)
- **Threat:** An adversary attempts to forge a valid proof without being registered in the allowlist.
- **Defense:** Compact circuit enforces `merkleRootFrom(leafOf(sk), path, dirs) == allowlistRoot`. Given collision-resistant cryptographic hash functions, producing a valid path to an uncommitted leaf has negligible probability ($\le 2^{-128}$).

### 6.2 Double-Access & Replay Attacks
- **Threat:** A legitimate member attempts to claim access multiple times (e.g. minting multiple times or voting repeatedly).
- **Defense:** The circuit deterministically derives `nullifier = persistentHash(sk, 1)` and checks `!nullifiers.member(nullifier)`. The first invocation inserts the nullifier into ledger state; subsequent attempts fail at the circuit assertion level.

### 6.3 Front-Running & Mempool Snooping
- **Threat:** A network observer or validator intercepts the transaction proof in the mempool and attempts to steal the access authorization.
- **Defense:** The transaction payload contains a zero-knowledge proof bound to the specific nullifier and transaction context. The proof reveals zero witness information, preventing malicious extraction or modification.

### 6.4 Linkability & Observer Tracking
- **Threat:** An adversary monitors consecutive transactions to link repeated interactions by the same user.
- **Defense:** All proof components are zero-knowledge. Each user's nullifier is pseudorandom and completely uncorrelated to their public wallet address or off-chain identity.

---

## 7. Verified Preprod Network Deployment

ShadowPass is deployed and verified on the **Midnight Preprod Testnet**:

- **Contract Address**: `f58d3e681578fff354e5391111b384f5dca9f39c9d567bdcf9fff84727ae8f56`
- **Explorer Link**: [https://preprod.midnightexplorer.com/contracts/0xf58d3e681578fff354e5391111b384f5dca9f39c9d567bdcf9fff84727ae8f56](https://preprod.midnightexplorer.com/contracts/0xf58d3e681578fff354e5391111b384f5dca9f39c9d567bdcf9fff84727ae8f56)
- **Circuit Verified**: `checkAccess()` in `allowlist.compact`
- **Network ID**: `preprod`
- **Indexer Endpoint**: `https://indexer.preprod.midnight.network/api/v4/graphql`
- **RPC Endpoint**: `https://rpc.preprod.midnight.network`

---

## 8. Test Coverage & CI/CD Pipeline

ShadowPass maintains a comprehensive **22-test automated test suite** across all layers of the stack:

| Test Suite | File | Coverage |
| :--- | :--- | :--- |
| **Contract Unit Tests** | `contract/src/allowlist.test.ts` | Merkle root computation, leaf derivation, nullifier uniqueness, witness providers |
| **Root Contract Tests** | `tests/allowlist.test.ts` | Integration testing of Compact circuit bindings and cryptographic primitives |
| **Preprod E2E Suite** | `tests/preprod-e2e.test.ts` | Full lifecycle: contract deployment/lookup, Merkle witness building, ZK proof generation, `checkAccess()` execution, nullifier recording, anti-replay rejection, invalid path rejection, and GraphQL indexer state queries |
| **Frontend Wallet Tests** | `frontend/src/frontend.test.ts` & `tests/frontend.test.ts` | Official DApp Connector API lifecycle, wallet connection, secure private state provider |
| **Indexer Service Tests** | `indexer/src/indexer.test.ts` & `tests/indexer.test.ts` | GraphQL indexer queries, event synchronization, public ledger state parsing |

The continuous integration pipeline ([`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml)) automatically triggers on push to `main`, explicitly verifies Compact sources, builds all workspace packages, and runs all 22 tests.

---

## 9. Hackathon Rubric Alignment

| Evaluation Criteria | ShadowPass Implementation & Evidence |
| :--- | :--- |
| **Privacy as Core Feature** | Privacy is the foundational reason for the dApp's existence—eliminating public address exposure via ZK Merkle inclusion proofs. |
| **Compact Contract Rigor** | Clean, secure Compact contract (`allowlist.compact`) with public ledger separation, witness declarations, and anti-replay nullifier tracking. |
| **Official Midnight Tooling** | Uses official `@midnight-ntwrk/dapp-connector-api`, Midnight.js contract bindings (`findDeployedContract`, `deployContract`), and Midnight Preprod Indexer. |
| **Verifiable Preprod Deployment** | Published contract address with live Preprod Explorer link, verified circuit executions, and authoritative deployment artifacts. |
| **Developer & User Experience** | Premium dark-mode UI with live Privacy Explainer, step-by-step ZK proof progress, and comprehensive technical documentation. |

---

## 10. Future Roadmap

1. **Epoch-Based & Revocable Allowlists:** Implementing Merkle accumulators with dynamic revocation witnesses for rotating membership passes.
2. **Multi-Tiered Access Tiers:** Supporting hierarchical access levels (e.g. VIP, Early Bird, General) within a single zero-knowledge circuit.
3. **Cross-DApp ZK Single Sign-On (SSO):** Enabling third-party dApps to query ShadowPass authorization status via Midnight cross-contract calls without learning user identities.
