# ShadowPass — Automated Testing & Verification Guide

## 1. Test Suite Overview

ShadowPass maintains a comprehensive **22-test automated test suite** running via Vitest across all layers of the stack:

```bash
npm test
```

### Test Results Breakdown (22 / 22 Tests Passing)

```
Test Files  7 passed (7)
     Tests  22 passed (22)
  Duration  ~2.8s
```

---

## 2. Detailed Test File Mapping

| Test File | Test Count | Module Tested | Key Verifications |
| :--- | :---: | :--- | :--- |
| **`tests/preprod-e2e.test.ts`** | 6 | Preprod Network E2E | 1. Locates/deploys real `AllowlistContract`<br/>2. Constructs valid Merkle witness vectors<br/>3. Executes `callTx.checkAccess()` circuit<br/>4. Confirms on-chain nullifier recording<br/>5. Asserts anti-replay rejection on duplicate submissions<br/>6. Asserts rejection of invalid Merkle paths & queries GraphQL indexer |
| **`contract/src/allowlist.test.ts`** | 4 | Smart Contract SDK | Leaf commitment hashing, 5-depth Merkle root derivation, nullifier uniqueness, `SecureMemoryPrivateStateProvider` |
| **`tests/allowlist.test.ts`** | 4 | Root Contract Integration | Isomorphic cryptographic hash validation, witness vector packaging, error assertions |
| **`frontend/src/frontend.test.ts`** | 3 | Frontend DApp Client | Official `@midnight-ntwrk/dapp-connector-api` integration, wallet extension discovery, secure private state provider |
| **`tests/frontend.test.ts`** | 3 | Root Frontend Tests | Wallet session lifecycle, transaction balancing, error propagation |
| **`indexer/src/indexer.test.ts`** | 1 | Indexer Service | Preprod GraphQL query client, event synchronization, public state extraction |
| **`tests/indexer.test.ts`** | 1 | Root Indexer Tests | End-to-end event subscription and ledger nullifier indexing |

---

## 3. Running Individual Test Suites

### Contract Tests Only:
```bash
npx vitest run contract/src/allowlist.test.ts
```

### Preprod E2E Integration Suite Only:
```bash
npx vitest run tests/preprod-e2e.test.ts
```

### Frontend Tests Only:
```bash
npx vitest run frontend/src/frontend.test.ts
```

### Indexer Tests Only:
```bash
npx vitest run indexer/src/indexer.test.ts
```

---

## 4. Continuous Integration (CI/CD)

The automated GitHub Actions workflow [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml) executes this full 22-test suite alongside explicit Compact compilation on every push to `main`.
