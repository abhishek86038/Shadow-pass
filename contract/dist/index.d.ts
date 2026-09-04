export declare const MIDNIGHT_CONFIG: {
    networkId: "preprod";
    indexerUri: string;
    indexerWsUri: string;
    nodeRpcUri: string;
    proofServerUri: string;
    defaultContractAddress: string;
};
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
    blockHeight?: number;
}
export interface MidnightContractBinding<TState = PublicLedgerState> {
    contractAddress: string;
    networkId: 'preprod' | 'testnet' | 'undeployed';
    getPublicLedgerState: () => TState | Promise<TState>;
    callTx: {
        proveMembership: (witnesses: PrivateWitnesses) => Promise<ProofResult>;
        registerMember?: (commitment: string) => Promise<{
            txHash: string;
            newRoot: string;
        }>;
    };
}
export declare function sha256Hash(data: string): string;
export declare function computeCommitment(secretKey: string, blindingSalt: string): string;
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
export declare class AllowlistContract implements MidnightContractBinding {
    contractAddress: string;
    networkId: 'preprod' | 'testnet' | 'undeployed';
    private ledger;
    merkleTree: MerkleTree;
    callTx: {
        proveMembership: (witnesses: PrivateWitnesses) => Promise<ProofResult>;
        registerMember?: (commitment: string) => Promise<{
            txHash: string;
            newRoot: string;
        }>;
    };
    constructor(adminPubKey: string, treeDepth?: number, contractAddress?: string);
    getPublicLedgerState(): PublicLedgerState;
    queryLedgerState(): Promise<PublicLedgerState>;
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
/**
 * Official Midnight.js deployContract helper function
 */
export declare function deployContract(adminPubKey: string, treeDepth?: number): Promise<{
    contract: AllowlistContract;
    deployedAddress: string;
    txHash: string;
}>;
/**
 * Official Midnight.js findDeployedContract helper function
 */
export declare function findDeployedContract(contractAddress: string): Promise<AllowlistContract>;
