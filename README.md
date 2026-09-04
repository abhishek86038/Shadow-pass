# ShadowPass — Zero-Knowledge Private Allowlist Access dApp

[![ShadowPass CI/CD Pipeline](https://github.com/abhishek86038/Shadow-pass/actions/workflows/ci.yml/badge.svg)](https://github.com/abhishek86038/Shadow-pass/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Midnight Blockchain](https://img.shields.io/badge/Blockchain-Midnight_Preprod-06b6d4.svg)](https://midnight.network)

---

## 1. Overview

**ShadowPass** is a privacy-preserving allowlist dApp built on the Midnight blockchain using Compact smart contracts, official Midnight.js contract bindings, and Zero-Knowledge proofs. It allows users to prove their membership in an admin-managed private allowlist without revealing their identity, wallet address, secret key, or Merkle tree position. ShadowPass was built for the **Midnight "New Moon to Full" Level 3 (First Quarter)** hackathon submission.

---

## 2. Problem Statement

In traditional blockchain ecosystems (such as Ethereum and EVM-compatible networks), implementing allowlist access control for token presales, NFT mints, gated communities, or member-only features requires storing raw public wallet addresses on-chain or verifying signatures publicly. This architectural design creates a severe privacy flaw by exposing every member's wallet address to the public ledger. Observers can link wallet addresses to real-world identities, monitor private transaction histories, track overall asset balances, and target high-value members for exploits. EVM allowlists force users to choose between exclusive access and basic personal financial privacy.

---

## 3. Solution

ShadowPass solves this privacy dilemma using Midnight's native Compact language and private state architecture:
1. **Blinded Identity Commitments:** The admin registers member commitments calculated as `leaf = SHA256(secretKey || blindingSalt)` into a depth-8 Merkle tree, publishing only the 32-byte Merkle root (`allowlistRoot`) on-chain.
2. **Local ZK Proof Construction:** Users construct Zero-Knowledge inclusion proofs locally on their client device using their private witness vector (`secretKey`, `blindingSalt`, `merklePath`, `pathDirections`).
3. **On-Chain Circuit Execution:** The prover invokes the Compact circuit `proveMembership()` which asserts that the reconstructed Merkle root matches the on-chain `allowlistRoot`.
4. **Verified Access Flag:** Upon successful verification, the contract updates `accessGranted = true` on the public ledger without ever recording the user's secret key, salt, leaf index, or wallet address.

---

## 🌐 Midnight Preprod Network & Deployment Info

ShadowPass is deployed to the official **Midnight Preprod Testnet** (`setNetworkId("preprod")`):

- **Network ID**: `preprod`
- **Contract Address**: `016cf1671e15625d75558638113accaf63052050c088e1d3afbb93afdcc72d94`
- **Deployment Tx Hash**: `0xe638097ef8187dbdf17728f03aa2e53649969039267a0c483202dd2220fcc409`
- **Allowlist Merkle Root**: `724a37d0341dad22668ef9096a9d3f87415919633ce0e35734f49c26e9a08ddf`
- **Preprod Indexer GraphQL**: `https://indexer.preprod.midnight.network/api/v1/graphql`
- **Preprod Node RPC**: `https://rpc.preprod.midnight.network`
- **Local Proof Server**: `http://127.0.0.1:6300`

---

## 4. Architecture

```
+-----------------------------------------------------------------------------------+
|                        USER CLIENT & MIDNIGHT LACE WALLET                         |
|                                                                                   |
|  [ Private Secret Key ] ──┐                                                       |
|  [ Blinding Salt     ] ───┼──► [ Compact ZK Membership Circuit ]                   |
|  [ Merkle Path       ] ──┘         (Proves Inclusion Locally)                     |
|                                                │                                  |
|                                                ▼                                  |
|                                 callTx.proveMembership()                          |
+------------------------------------------------│----------------------------------+
                                                 │ Signs & Submits via Lace API
                                                 ▼
+-----------------------------------------------------------------------------------+
|                           MIDNIGHT PREPROD PUBLIC LEDGER                          |
|                                                                                   |
|  Public State:                                                                    |
|    - allowlistRoot: 0xa4f8c92e... (32-byte Merkle Root)                           |
|    - accessGranted: TRUE / FALSE  (Public Verification Status)                    |
|    - registeredCount: 2           (Total Allowlist Members)                       |
|    - lastEventNonce: #3           (Event Sequence Counter)                        |
|                                                                                   |
|  Verification Logic:                                                              |
|    assert(reconstructedRoot == allowlistRoot) ──► ledger.accessGranted = true     |
+-----------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+-----------------------------------------------------------------------------------+
|                      MIDNIGHT PREPROD GRAPHQL EVENT INDEXER                       |
|                                                                                   |
|  GraphQL Service (https://indexer.preprod.midnight.network/api/v1/graphql):       |
|    - Query contract state transitions and public verification receipts            |
|    - Synchronize event stream without exposing prover identity                    |
+-----------------------------------------------------------------------------------+
```

### Component Implementation Mapping
- **Smart Contract & ZK Circuit:** Implemented in `contract/allowlist.compact`, defining the Compact ledger state and local ZK circuit `proveMembership()`.
- **Contract SDK & Midnight.js Bindings:** Implemented in `contract/src/index.ts`, managing the depth-8 Merkle tree, isomorphic SHA-256 hashing, Midnight.js contract binding interfaces, and `deployContract()` / `findDeployedContract()` helpers.
- **Frontend Application:** Implemented in `frontend/src/App.tsx` and `frontend/src/contract-bindings.ts`, handling Lace Wallet DApp Connector API (`window.midnight.mnLace`), proof submission UI, admin commitment panel, and privacy inspector.
- **Event Indexer Backend:** Implemented in `indexer/src/index.ts`, connecting to the Midnight Preprod GraphQL Indexer and exposing REST API endpoints for off-chain monitoring.

---

## 5. 🔒 Privacy Model

The ShadowPass privacy model enforces a strict separation between public on-chain ledger state and client-side private state:

### What an observer CAN see:
- 🟢 **The Merkle Root (`allowlistRoot`):** A 32-byte hash representing the commitment tree of authorized members.
- 🟢 **The Public Verification Result (`accessGranted`):** A boolean flag indicating whether a valid member successfully proved access.
- 🟢 **Total Registered Member Count (`registeredCount`):** The number of identity commitments added by the admin.
- 🟢 **Contract Address & Nonce (`lastEventNonce`):** Transaction nonces for event indexer synchronization.

### What an observer CANNOT see:
- 🛑 **Which specific member proved access:** No leaf index, member ID, or position in the tree is revealed.
- 🛑 **The member's wallet address or public identity:** The prover's wallet address is never recorded on-chain or passed to contract state.
- 🛑 **The member's private secret key (`witnessSecretKey`):** Secret keys remain strictly inside local client witness storage.
- 🛑 **Blinding salts or Merkle sibling paths:** Authentication paths remain local to the prover's Compact circuit context.
- 🛑 **Proof linkability:** Multiple proofs submitted by the same member generate identical, un-linkable public state transitions.

> **Contrast:** Unlike a traditional EVM allowlist where every member's public address is visibly listed on-chain, ShadowPass ensures the public ledger only ever sees *"a valid member proved access"* — never who.

---

## 6. Tech Stack

- **Smart Contract / Circuits:** Midnight Compact language (`allowlist.compact`)
- **Midnight SDK & Runtime:** `@midnight-ntwrk/compact-runtime`, `@midnight-ntwrk/dapp-connector-api`, `@midnight-ntwrk/midnight-js-contracts`
- **Frontend Framework:** React (v18.2), TypeScript (v5.4), Vite (v5.1), Tailwind CSS (v3.4), Lucide Icons, Framer Motion
- **Backend Indexer:** Node.js, Express (v4.19), GraphQL client, CORS
- **Testing Framework:** Vitest (v1.6) for unit and integration testing (18 passing tests)
- **CI/CD Pipeline:** GitHub Actions (`.github/workflows/ci.yml`)

---

## 7. Getting Started

### Prerequisites
- **Node.js:** `v20.x` or higher
- **npm:** `v10.x` or higher
- **Midnight Lace Wallet Extension:** Configured to Preprod Testnet

### Installation & Quick Start

1. Clone the repository and install root dependencies:
```bash
git clone https://github.com/abhishek86038/Shadow-pass.git
cd Shadow-pass
npm install
```

2. Install sub-package workspace dependencies:
```bash
npm --prefix contract install
npm --prefix indexer install
npm --prefix frontend install
```

3. Compile Compact smart contracts and build TypeScript packages:
```bash
npm run build
```

4. Start the Frontend Development Server (Port 3000):
```bash
npm run dev:frontend
```

5. Start the Event Indexer Service (Port 4000):
```bash
npm run dev:indexer
```

---

## 8. Running Tests

Execute the complete 18-test suite across contract, circuit, frontend, and indexer modules:

```bash
npm test
```

### Test Suite Coverage & Verification
- **`contract/src/allowlist.test.ts` & `tests/allowlist.test.ts` (6 tests each):** Verifies valid ZK membership proof execution, rejection of non-member secrets, zero identity leakage in public state JSON, admin Merkle root updates, official `deployContract()` helper, and `callTx.proveMembership()` interface binding.
- **`frontend/src/frontend.test.ts` & `tests/frontend.test.ts` (2 tests each):** Verifies real Midnight Lace DApp connector extension detection, Preprod network configuration, and end-to-end frontend ZK proof submission flow.
- **`indexer/src/indexer.test.ts` & `tests/indexer.test.ts` (1 test each):** Verifies backend event indexer state synchronization, GraphQL proxy, and event logging.

---

## 9. CI/CD Pipeline

The project includes an automated GitHub Actions workflow defined in `.github/workflows/ci.yml`.

On every `push` and `pull_request` to `main` or `master` branches, the CI pipeline automatically:
1. Sets up Node.js v20 environment.
2. Installs root and workspace dependencies (`npm install`).
3. Compiles Compact smart contracts and TypeScript packages (`npm run build`).
4. Executes the full 18-test suite via Vitest (`npm test`).

---

## 10. Visual Evidence & Screenshots

Here is the visual evidence showing the running GhostVault dApp UI, the local Vitest suite execution, and the GitHub Actions CI/CD run status:

***🛡️ GhostVault / dApp UI ***
![alt text](image.png)
***🧪 Passing Unit & Integration Tests***
![alt text](image-4.png)
***💚 GitHub Actions CI/CD Run Status ***
![alt text](image-3.png)
---

## 11. Live Demo

🔗 Live demo: [shadow-pass.vercel.app](https://shadow-pass.vercel.app/)

---

## 12. Demo Video

🎥 Demo video (1 min): [Watch Demo Video](https://photos.app.goo.gl/UPcnamPqq9xaidDWA)

---

## 13. Project Structure

```
ShadowPass/
├── .github/workflows/ci.yml    # GitHub Actions workflow for automated compile & test
├── contract/                   # Midnight Compact smart contract & TypeScript SDK package
│   ├── allowlist.compact       # Compact smart contract & ZK membership circuit
│   └── src/index.ts            # Merkle tree implementation, Midnight.js contract binding & deploy helpers
├── frontend/                   # React + TypeScript + Vite + Tailwind dApp
│   ├── src/App.tsx             # Main user interface & Privacy Model inspector
│   ├── src/contract-bindings.ts# Midnight Lace DApp Connector API & callTx circuit execution
│   └── vercel.json             # Vercel deployment configuration
├── indexer/                    # Midnight Preprod GraphQL event indexer service
│   └── src/index.ts            # GraphQL query client & REST monitoring API
├── tests/                      # Full Vitest integration test suite (18 tests)
└── README.md                   # Complete protocol documentation & deployment specification
```

---

## 14. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 15. Repository & Project Details

- **GitHub Repository**: [https://github.com/abhishek86038/Shadow-pass](https://github.com/abhishek86038/Shadow-pass)
- **Primary Branch**: `main`
- **Author / Maintainer**: `abhishek86038`
- **Live dApp URL**: [https://shadow-pass.vercel.app/](https://shadow-pass.vercel.app/)
- **Demo Video**: [https://photos.app.goo.gl/UPcnamPqq9xaidDWA](https://photos.app.goo.gl/UPcnamPqq9xaidDWA)

