# ShadowPass — User & Operator Guide

## 1. Introduction
ShadowPass allows users to prove membership in a private allowlist using Zero-Knowledge proofs without revealing their identity or wallet address on-chain.

---

## 2. Prerequisites
1. **Google Chrome / Brave Browser**
2. **Midnight Lace Wallet Extension** (or **1AM Wallet**) configured to the **Midnight Preprod Network**.
3. Some Preprod testnet tokens (tDUST) for transaction fee balancing.

---

## 3. Step-by-Step User Flow

### Step 1: Connect Midnight Wallet
- Open the live dApp: [https://shadow-pass-e28i.vercel.app/](https://shadow-pass-e28i.vercel.app/)
- Click **"Connect Midnight Wallet"** in the top right corner.
- Approve the DApp Connector prompt in Lace / 1AM.
- The interface will display your connected network (`preprod`) and shielded coin public key.

### Step 2: Input Your Private Credential
- In the **Zero-Knowledge Access Gate** panel, paste your 32-byte private Secret Key (hex format).
- Your client locally derives your blinded leaf commitment:
  $$\text{leaf} = \text{persistentHash}(sk, 0)$$
- The client automatically constructs your 5-depth Merkle witness vector (`merklePath`, `pathDirections`).

### Step 3: Generate Zero-Knowledge Proof & Verify
- Click **"Generate ZK Proof & Unlock Access"**.
- The client executes the Compact circuit `checkAccess()` in local WASM memory.
- The prover verifies:
  1. Your leaf matches the committed on-chain `allowlistRoot`.
  2. Your nullifier has not been previously spent.
- The Lace wallet prompts you to balance and sign the transaction.
- Once confirmed on Preprod, the UI displays a green `🟢 ACCESS GRANTED` badge along with the on-chain transaction receipt.

### Step 4: Anti-Replay Safeguard
- If you attempt to use the same secret key again, the Compact circuit and contract immediately reject the transaction with:
  `"Nullifier already spent: access has already been claimed"`

---

## 4. Admin / Issuer Workflow

### Registering Members into Merkle Root
1. The admin collects member secret key commitments (`leafOf(sk)`).
2. The admin constructs the depth-5 Merkle tree off-chain.
3. The admin deploys or updates the contract with the resulting 32-byte `allowlistRoot`.
4. Members can now prove membership without ever revealing their identity to the admin or the blockchain.
