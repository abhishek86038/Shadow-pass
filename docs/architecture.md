# ShadowPass — System Architecture & Component Blueprints

## 1. System Topology Overview

ShadowPass is engineered as a full-stack, privacy-preserving decentralised application consisting of four tightly integrated layers:

```mermaid
flowchart TB
    subgraph Client ["Client Browser & DApp Layer"]
        UI["React 18 + Vite Frontend"]
        W["Midnight Lace / 1AM Wallet Extension"]
        WProv["SecureMemoryPrivateStateProvider"]
        ZKProver["Midnight WASM Proof Engine"]
    end

    subgraph MidnightContract ["Midnight Smart Contract Layer"]
        Compact["allowlist.compact Circuit Engine"]
        StatePub["Public Ledger State<br/>(allowlistRoot, accessGranted, nullifiers)"]
        StatePriv["Private Witness Context<br/>(secretKey, merklePath, pathDirections)"]
    end

    subgraph Network ["Midnight Preprod Network"]
        RPC["Preprod Node RPC<br/>(https://rpc.preprod.midnight.network)"]
        ProverSrv["Midnight Preprod Proof Server<br/>(https://prover.preprod.midnight.network)"]
        Indexer["GraphQL Event Indexer<br/>(https://indexer.preprod.midnight.network/api/v4/graphql)"]
    end

    subgraph Backend ["ShadowPass Indexer & Monitoring"]
        IndexService["Node.js / Express GraphQL Sync Service"]
        REST["REST API & Event Cache"]
    end

    UI -->|"1. Connect via DApp Connector"| W
    UI -->|"2. Load Private State"| WProv
    WProv -->|"3. Supply Witness Vectors"| ZKProver
    ZKProver -->|"4. Synthesize ZK Proof"| Compact
    Compact -->|"5. Assert Invariants"| StatePub
    W -->|"6. Sign & Balance Transaction"| RPC
    RPC -->|"7. Mine Block & Finalize"| StatePub
    StatePub -->|"8. Push Block Events"| Indexer
    Indexer -->|"9. Query Ledger States"| IndexService
    IndexService -->|"10. Feed Real-time Updates"| UI
```

---

## 2. Component Specifications

### 2.1 Compact Smart Contract (`contract/allowlist.compact`)
- **Ledger State:**
  - `allowlistRoot: Bytes<32>` — Committed root hash.
  - `accessGranted: Counter` — Public verification counter.
  - `nullifiers: Set<Bytes<32>>` — Anti-replay spent nullifier set.
  - `issuer: ZswapCoinPublicKey` — Admin coin public key.
- **Circuit Function:** `checkAccess()`
  - Reconstructs Merkle root from private witness inputs.
  - Asserts calculated root equals `allowlistRoot`.
  - Asserts freshness of nullifier.
  - Atomically records nullifier and increments counter.

### 2.2 Contract SDK & Bindings (`contract/src/index.ts`)
- TypeScript wrapper providing high-level type-safe APIs:
  - `findDeployedContract()` — Connects to an existing contract instance on Preprod.
  - `deployContract()` — Deploys a new `AllowlistContract` with an initialized Merkle root.
  - `SecureMemoryPrivateStateProvider` — Secure, memory-isolated witness state manager.
  - `computeMerkleRootFrom()`, `computeLeafCommitment()`, `computeNullifier()` — Isomorphic implementations of Compact cryptographic primitives.

### 2.3 Frontend Application (`frontend/src/`)
- Built with React 18, Vite, and Tailwind CSS.
- Integrates the official `@midnight-ntwrk/dapp-connector-api`.
- Interactive **Privacy Explainer** and **Zero-Knowledge Proof Progress Indicator**.
- Error-resilient transaction execution without simulated fake outcomes.

### 2.4 Indexer & Monitoring Service (`indexer/src/index.ts`)
- Continuously queries Midnight Preprod GraphQL endpoints (`/api/v4/graphql`).
- Synchronizes `allowlistRoot`, `accessGranted`, and `nullifiers` on-chain states.
- Exposes clean JSON REST endpoints for dApp integration and analytical monitoring.
