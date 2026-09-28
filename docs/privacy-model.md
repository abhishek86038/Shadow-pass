# ShadowPass — Midnight Privacy Model & Cryptographic Specification

## 1. Core Privacy Thesis
On transparent blockchains (Ethereum, Solana, EVM L2s), allowlist access control requires either storing raw user addresses on-chain in public storage (`mapping(address => bool)`) or having users submit a signature alongside their public key. In both paradigms, every participant's wallet address, transaction history, and asset balances are permanently visible on the public ledger.

**ShadowPass** fundamentally eliminates this privacy defect by leveraging Midnight's native **dual-state ledger architecture** and **Zero-Knowledge Compact circuits**.

---

## 2. Public vs. Private State Separation

Midnight strictly enforces isolation between **Public Ledger State** and **Private Witness State**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SHADOWPASS PRIVACY BOUNDARY                          │
├───────────────────────────────────────────────────┬────────────────────────────────────┤
│           LOCAL PRIVATE WITNESS (CLIENT)          │    PUBLIC ON-CHAIN LEDGER (MIDNIGHT)│
├───────────────────────────────────────────────────┼────────────────────────────────────┤
│ • Prover Secret Key (secretKey: Uint8Array<32>)   │ • Committed Merkle Root            │
│ • Merkle Sibling Hashes (merklePath: Vector<5>)   │   (allowlistRoot: Bytes<32>)       │
│ • Merkle Path Directions (pathDirections: Vector) │ • Verified Counter (accessGranted) │
│ • Blinded Leaf Calculation (leafOf(secretKey))    │ • Nullifier Set (nullifiers)       │
│ • Prover Wallet Address & Balances                │ • Issuer Public Key (issuer)       │
│                                                   │ • Transaction Nonce & Block Time   │
└───────────────────────────────────────────────────┴────────────────────────────────────┘
```

### Detailed Privacy Breakdown

| Data Field | Visibility | Storage Location | Cryptographic Guarantee |
| :--- | :---: | :---: | :--- |
| **`secretKey`** | 🔒 Private | Client Secure Memory (`SecureMemoryPrivateStateProvider`) | Never leaves the prover's local machine; consumed only inside WASM ZK prover. |
| **`merklePath`** | 🔒 Private | Client Secure Memory | Sibling hashes used to reconstruct the root inside the circuit; zero path disclosure. |
| **`pathDirections`** | 🔒 Private | Client Secure Memory | Left/right traversal bits kept strictly private inside circuit witness. |
| **`leafOf(sk)`** | 🔒 Private | Local Circuit Evaluation | Derived deterministically as `persistentHash(sk, 0)`. Never stored in ledger. |
| **`nullifier`** | 👁️ Public (Disclosed) | On-Chain Ledger (`nullifiers: Set<Bytes<32>>`) | Derived as `persistentHash(sk, 1)`. Cryptographically one-way and unlinkable to `sk`. |
| **`allowlistRoot`** | 👁️ Public | On-Chain Ledger (`allowlistRoot: Bytes<32>`) | 32-byte hash commitment representing the entire allowlist set. |
| **`accessGranted`** | 👁️ Public | On-Chain Ledger (`Counter`) | Public state counter incremented upon verified ZK execution. |

---

## 3. Circuit Execution & Disclosure Policy

The circuit [`contract/allowlist.compact`](file:///contract/allowlist.compact) contains zero unnecessary disclosures:

```compact
export circuit checkAccess(): [] {
    val sk = secretKey();
    val path = merklePath();
    val dirs = pathDirections();

    val leaf = leafOf(sk);
    val nullifier = persistentHash<Bytes<32>, Bytes<32>>(sk, 1 as Bytes<32>);

    val computedRoot = merkleRootFrom(leaf, path, dirs);
    assert(computedRoot == allowlistRoot, "Prover leaf is not a valid member of the allowlist Merkle root");

    assert(!nullifiers.member(disclose(nullifier)), "Nullifier already spent: access has already been claimed");

    nullifiers.insert(disclose(nullifier));
    accessGranted.increment(1);
}
```

### Disclosed Variables
1. **`nullifier`**: Explicitly disclosed (`disclose(nullifier)`) to update the on-chain anti-replay set `nullifiers.insert(...)`. Because `persistentHash` is collision-resistant and pre-image resistant, observing `nullifier` reveals 0 bits of information regarding `sk` or the user's tree index.

### Undisclosed Variables (Strictly Private)
- `sk` (Prover Secret Key)
- `path` (Merkle sibling vector)
- `dirs` (Tree navigation directions)
- `leaf` (Blinded commitment)
- Prover wallet address (Fees and transaction balancing are handled orthogonally via the DApp connector).

---

## 4. Anonymity Set & Unlinkability

- **Anonymity Set Size:** For a depth-5 tree, up to $2^5 = 32$ participants share the exact same allowlist root. To an outside observer, any verification is equally likely to originate from any of the members in the tree.
- **Unlinkability:** An observer cannot correlate multiple transactions across different contracts even if the same user participates, because distinct salt/domain separators can be applied per deployment.
