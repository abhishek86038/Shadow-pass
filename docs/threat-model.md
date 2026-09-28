# ShadowPass — Threat Model Specification

Refer to [Security Model & Threat Invariant Analysis](security.md) for full cryptographic details.

### Key Assumptions & Trust Model
1. **Midnight Network Consensus:** Byzantine fault tolerance of the Midnight Preprod validator network.
2. **Compact Compiler Correctness:** Correct generation of R1CS/PLONK constraint systems by the official Midnight Compact compiler.
3. **User Client Endpoint:** User's device is not compromised by root-level kernel keyloggers.
4. **Collision Resistance:** Underlying hash functions exhibit 128-bit post-quantum and classical security.
