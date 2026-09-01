// ============================================================================
// Types & Interfaces
// ============================================================================
export interface PublicLedgerState {
  allowlistRoot: string; // 32-byte hex hash string
  accessGranted: boolean;
  registeredCount: number;
  adminIdentity: string;
  lastEventNonce: number;
}

export interface PrivateWitnesses {
  secretKey: string;       // 32-byte hex
  blindingSalt: string;    // 32-byte hex
  merklePath: string[];    // Array of 8 sibling hash strings
  pathDirections: boolean[]; // Array of 8 booleans (false = left sibling, true = right sibling)
}

export interface ProofResult {
  success: boolean;
  accessGranted: boolean;
  proofVerified: boolean;
  error?: string;
  txHash?: string;
}

// ============================================================================
// Isomorphic SHA-256 Cryptographic Utility (Node & Browser Compatible)
// ============================================================================

function sha256Pure(hexInput: string): string {
  // Convert hex string input to Uint8Array bytes
  const cleanHex = hexInput.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }

  // SHA-256 constants
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  const l = bytes.length;
  const bitLen = l * 8;
  const k = (448 - ((l * 8 + 8) % 512) + 512) % 512;
  const paddedLen = l + 1 + k / 8 + 8;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes, 0);
  padded[l] = 0x80;

  // Append bit length as 64-bit big endian integer
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen & 0xffffffff, false);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);

  const W = new Uint32Array(64);
  for (let i = 0; i < paddedLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = ((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^ ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^ (W[t - 15] >>> 3);
      const s1 = ((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^ ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H0 = (H0 + a) | 0;
    H1 = (H1 + b) | 0;
    H2 = (H2 + c) | 0;
    H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0;
    H5 = (H5 + f) | 0;
    H6 = (H6 + g) | 0;
    H7 = (H7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return toHex(H0) + toHex(H1) + toHex(H2) + toHex(H3) + toHex(H4) + toHex(H5) + toHex(H6) + toHex(H7);
}

/**
 * Computes SHA-256 hash of string or hex input
 */
export function sha256Hash(data: string): string {
  return sha256Pure(data);
}

/**
 * Computes leaf commitment hash matching Compact circuit:
 * leaf = SHA256(secretKey || blindingSalt)
 */
export function computeCommitment(secretKey: string, blindingSalt: string): string {
  const combined = secretKey.trim().toLowerCase() + blindingSalt.trim().toLowerCase();
  return sha256Pure(combined);
}

/**
 * Concatenates two hashes and returns SHA-256 digest
 */
export function sha256Concat(left: string, right: string): string {
  return sha256Pure(left + right);
}

// ============================================================================
// 8-Level Merkle Tree Implementation
// ============================================================================
export class MerkleTree {
  public depth: number;
  public leaves: string[];
  public emptyLeaf: string;

  constructor(depth: number = 8) {
    this.depth = depth;
    this.leaves = [];
    this.emptyLeaf = '0'.repeat(64);
  }

  public addLeaf(leafHash: string): number {
    this.leaves.push(leafHash);
    return this.leaves.length - 1;
  }

  public getRoot(): string {
    if (this.leaves.length === 0) {
      return this.computeZeroRoot();
    }

    let currentLevel = [...this.leaves];
    const totalSlots = Math.pow(2, this.depth);
    
    while (currentLevel.length < totalSlots) {
      currentLevel.push(this.emptyLeaf);
    }

    for (let level = 0; level < this.depth; level++) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        nextLevel.push(sha256Concat(left, right));
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  public getProof(index: number): { path: string[]; directions: boolean[] } {
    const totalSlots = Math.pow(2, this.depth);
    let currentLevel = [...this.leaves];
    
    while (currentLevel.length < totalSlots) {
      currentLevel.push(this.emptyLeaf);
    }

    const path: string[] = [];
    const directions: boolean[] = [];

    let currentIndex = index;
    for (let level = 0; level < this.depth; level++) {
      const isRightSibling = currentIndex % 2 === 0;
      const siblingIndex = isRightSibling ? currentIndex + 1 : currentIndex - 1;
      
      path.push(currentLevel[siblingIndex]);
      directions.push(isRightSibling); // true if sibling is right, false if left

      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        nextLevel.push(sha256Concat(currentLevel[i], currentLevel[i + 1]));
      }
      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { path, directions };
  }

  private computeZeroRoot(): string {
    let current = this.emptyLeaf;
    for (let i = 0; i < this.depth; i++) {
      current = sha256Concat(current, current);
    }
    return current;
  }
}

// ============================================================================
// Midnight Compact Contract Runtime Simulator & SDK Binding Interface
// ============================================================================
export class AllowlistContract {
  private ledger: PublicLedgerState;
  public merkleTree: MerkleTree;

  constructor(adminPubKey: string, treeDepth: number = 8) {
    this.merkleTree = new MerkleTree(treeDepth);
    const initialRoot = this.merkleTree.getRoot();

    this.ledger = {
      allowlistRoot: initialRoot,
      accessGranted: false,
      registeredCount: 0,
      adminIdentity: adminPubKey,
      lastEventNonce: 0
    };
  }

  public getPublicLedgerState(): PublicLedgerState {
    return { ...this.ledger };
  }

  public registerMemberSecret(secretKey: string, blindingSalt: string): { commitment: string; index: number; newRoot: string } {
    const commitment = computeCommitment(secretKey, blindingSalt);
    const index = this.merkleTree.addLeaf(commitment);
    const newRoot = this.merkleTree.getRoot();

    this.ledger.allowlistRoot = newRoot;
    this.ledger.registeredCount = this.merkleTree.leaves.length;
    this.ledger.lastEventNonce += 1;

    return { commitment, index, newRoot };
  }

  public addCommitment(commitment: string): { index: number; newRoot: string } {
    const index = this.merkleTree.addLeaf(commitment);
    const newRoot = this.merkleTree.getRoot();

    this.ledger.allowlistRoot = newRoot;
    this.ledger.registeredCount = this.merkleTree.leaves.length;
    this.ledger.lastEventNonce += 1;

    return { index, newRoot };
  }

  public proveMembership(witnesses: PrivateWitnesses): ProofResult {
    const leaf = computeCommitment(witnesses.secretKey, witnesses.blindingSalt);
    const expectedRoot = this.ledger.allowlistRoot;
    
    let verifiedRoot = leaf;
    for (let i = 0; i < witnesses.merklePath.length; i++) {
      const sibling = witnesses.merklePath[i];
      const isRightSibling = witnesses.pathDirections[i];
      if (isRightSibling) {
        verifiedRoot = sha256Concat(verifiedRoot, sibling);
      } else {
        verifiedRoot = sha256Concat(sibling, verifiedRoot);
      }
    }

    if (verifiedRoot !== expectedRoot) {
      return {
        success: false,
        accessGranted: false,
        proofVerified: false,
        error: `ZK Proof Verification Failed: Secret identity is not in the allowlist Merkle tree (Calculated: ${verifiedRoot.slice(0, 10)}... vs On-Chain: ${expectedRoot.slice(0, 10)}...)`
      };
    }

    this.ledger.accessGranted = true;
    this.ledger.lastEventNonce += 1;

    const fakeTxHash = '0x' + sha256Pure(Date.now().toString() + verifiedRoot);

    return {
      success: true,
      accessGranted: true,
      proofVerified: true,
      txHash: fakeTxHash
    };
  }

  public resetAccessStatus(): void {
    this.ledger.accessGranted = false;
  }
}
