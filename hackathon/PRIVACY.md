# ShadowPass — Midnight Privacy Model

Refer to [docs/privacy-model.md](../docs/privacy-model.md) for the full cryptographic analysis, circuit disclosure tables, and anonymity bounds.

### Summary
- **Public on Ledger:** `allowlistRoot` (32 bytes), `accessGranted` (Counter), `nullifiers` (Set of spent nullifiers).
- **Private to Prover:** `secretKey` (32 bytes), `merklePath` (5 sibling hashes), `pathDirections` (5 bits), prover's wallet address.
- **Circuit:** `checkAccess()` in `contract/allowlist.compact`.
