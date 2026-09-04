export interface PublicLedgerState {
    allowlistRoot: string;
    accessGranted: boolean;
    registeredCount: number;
    adminIdentity: string;
    lastEventNonce: number;
}
export interface PrivateWitnesses {
    secretKey: string;
    blindingSalt: string;
    merklePath: string[];
    pathDirections: boolean[];
}
export interface ProofResult {
    success: boolean;
    accessGranted: boolean;
    proofVerified: boolean;
    error?: string;
    txHash?: string;
}
/**
 * Computes SHA-256 hash of string or hex input
 */
export declare function sha256Hash(data: string): string;
/**
 * Computes leaf commitment hash matching Compact circuit:
 * leaf = SHA256(secretKey || blindingSalt)
 */
export declare function computeCommitment(secretKey: string, blindingSalt: string): string;
/**
 * Concatenates two hashes and returns SHA-256 digest
 */
export declare function sha256Concat(left: string, right: string): string;
export declare class MerkleTree {
    depth: number;
    leaves: string[];
    emptyLeaf: string;
    constructor(depth?: number);
    addLeaf(leafHash: string): number;
    getRoot(): string;
    getProof(index: number): {
        path: string[];
        directions: boolean[];
    };
    private computeZeroRoot;
}
export declare class AllowlistContract {
    private ledger;
    merkleTree: MerkleTree;
    constructor(adminPubKey: string, treeDepth?: number);
    getPublicLedgerState(): PublicLedgerState;
    registerMemberSecret(secretKey: string, blindingSalt: string): {
        commitment: string;
        index: number;
        newRoot: string;
    };
    addCommitment(commitment: string): {
        index: number;
        newRoot: string;
    };
    proveMembership(witnesses: PrivateWitnesses): ProofResult;
    resetAccessStatus(): void;
}
