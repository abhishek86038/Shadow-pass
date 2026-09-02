# ShadowPass — 1-Minute Video Demo Script & Scene Outline

**Target Length:** 60 Seconds  
**Focus:** Connecting Lace Wallet, compiling ZK proof locally, submitting proof on-chain, and demonstrating Zero Identity Leakage.

---

### Scene 1: Introduction & Problem (0:00 - 0:12)
- **Visual:** Show ShadowPass dApp interface with dark glassmorphism theme and Midnight branding.
- **Voiceover:** *"Welcome to ShadowPass — a zero-knowledge private allowlist protocol built on the Midnight blockchain. Traditional EVM allowlists force users to expose their public wallet addresses on-chain, destroying user privacy. ShadowPass solves this using Zero-Knowledge proofs."*

---

### Scene 2: Connecting Lace Wallet & Viewing Public Ledger (0:12 - 0:25)
- **Visual:** Click "Connect Lace Wallet" button in top-right corner. Show wallet status updated with Midnight Testnet connection. Point to the On-Chain Public Ledger card showing `allowlistRoot` and `accessGranted: FALSE`.
- **Voiceover:** *"First, we connect our Midnight Lace Wallet. Notice the public ledger state: it contains a 32-byte Merkle root representing authorized members, while accessGranted is currently set to FALSE."*

---

### Scene 3: Client-Side ZK Proof Generation (0:25 - 0:42)
- **Visual:** Click "Member 1 (Valid Allowed)" preset button to autofill secret key and salt. Click **"Generate ZK Proof & Submit On-Chain"**. Show progress spinner with "Compiling ZK Proof & Submitting to Midnight...".
- **Voiceover:** *"Now, we prove our membership. The user enters their private secret key and salt. Midnight's Compact ZK prover executes locally in the client context, proving Merkle tree inclusion without sending the secret or address over the wire."*

---

### Scene 4: Verification & Zero Identity Leakage Proof (0:42 - 1:00)
- **Visual:** Show green success card: **"ZK Membership Proof Verified Successfully! ACCESS GRANTED"**. Point to the updated On-Chain Public Ledger showing `accessGranted: TRUE`. Switch to the **Midnight Privacy Model** tab highlighting that observers CANNOT see the member address, secret key, or tree position.
- **Voiceover:** *"The Midnight contract verifies the proof and sets accessGranted to TRUE! Anyone can verify access was granted, but zero identity metadata was leaked. That is the power of Midnight privacy."*
