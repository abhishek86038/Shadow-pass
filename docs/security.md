# ShadowPass — Security Model & Threat Invariant Analysis

## 1. Security Invariants

ShadowPass enforces five foundational cryptographic invariants:

1. **Membership Soundness:**  
   It is computationally infeasible for an adversary who does not possess a preimage `sk` corresponding to a leaf committed in `allowlistRoot` to generate a valid zero-knowledge proof.
2. **Zero-Knowledge Witness Secrecy:**  
   The zero-knowledge proof transcript reveals zero information regarding `sk`, `merklePath`, `pathDirections`, or the prover's leaf index.
3. **Double-Claim / Replay Resistance:**  
   Each secret key produces a unique, deterministic nullifier:
   $$\text{nullifier} = \text{persistentHash}(sk, 1)$$
   The smart contract guarantees that any nullifier present in `nullifiers` cannot be reused.
4. **Front-Running & Interception Immunity:**  
   Mempool eavesdroppers cannot extract secret keys or redirect authorization because the proof is cryptographically bound to the transaction payload.
5. **Private State Isolation:**  
   Client private state is never stored in persistent browser storage (`localStorage` or `sessionStorage`); it resides strictly within `SecureMemoryPrivateStateProvider` in ephemeral memory.

---

## 2. Threat Vector Matrix & Mitigations

| Threat Vector | Attack Description | Mitigation Mechanism |
| :--- | :--- | :--- |
| **Forged Merkle Proof** | Attacker creates arbitrary sibling hashes to simulate membership. | Collision resistance of SHA-256 / `persistentHash`. Merkle root reconstruction enforced inside the Compact ZK circuit. |
| **Double-Spending / Replay** | Member uses the same credential multiple times. | The circuit checks `assert(!nullifiers.member(disclose(nullifier)))` and registers `nullifier` atomically. |
| **Mempool Sniffing** | Validator attempts to steal the prover's verification. | The ZK proof discloses only the nullifier. The secret key is never broadcast in calldata or mempool. |
| **State Tampering** | Malicious actor modifies local client memory during proof creation. | The proof synthesis occurs in isolated WASM memory; invalid witness inputs fail circuit verification locally before broadcast. |
| **Denial of Service** | Flooding transaction submissions to exhaust contract resources. | Standard Midnight gas fees and DUST token balancing managed via DApp connector. |

---

## 3. Cryptographic Primitives & Hashes
- **Leaf Commitment:** $\text{leaf} = \text{persistentHash}(sk, 0)$
- **Nullifier Generation:** $\text{nullifier} = \text{persistentHash}(sk, 1)$
- **Node Hash:** $\text{parent} = \text{persistentHash}(\text{left}, \text{right})$
- **Domain Separation:** Integer constants $0$ and $1$ prevent hash collisions between leaf commitments and nullifiers.
