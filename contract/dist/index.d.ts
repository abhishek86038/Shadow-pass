import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
export type ContractAddress = string;
export interface WitnessContext<L, PS> {
    ledger: L;
    privateState: PS;
    contractAddress: ContractAddress;
}
export declare const MIDNIGHT_CONFIG: {
    networkId: "preprod";
    indexerUri: string;
    indexerWsUri: string;
    nodeRpcUri: string;
    proofServerUri: string;
    defaultContractAddress: string;
};
export type Witnesses<PS> = {
    secretKey(context: __compactRuntime.WitnessContext<CompactLedger, PS>): [PS, Uint8Array] | Promise<[PS, Uint8Array]>;
    merklePath(context: __compactRuntime.WitnessContext<CompactLedger, PS>): [PS, [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array]] | Promise<[PS, [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array]]>;
    pathDirections(context: __compactRuntime.WitnessContext<CompactLedger, PS>): [PS, [boolean, boolean, boolean, boolean, boolean]] | Promise<[PS, [boolean, boolean, boolean, boolean, boolean]]>;
};
export type ImpureCircuits<PS> = {
    publishAllowlist(context: __compactRuntime.CircuitContext<PS>, newRoot_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
    checkAccess(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
};
export type PureCircuits = {
    publicStats(context: any): [Uint8Array, bigint];
};
export type CompactLedger = {
    readonly allowlistRoot: Uint8Array;
    readonly issuer: Uint8Array;
    readonly accessGranted: bigint;
    readonly nullifiers: Set<string>;
};
export declare class CompactContract<PS, W extends Witnesses<PS> = Witnesses<PS>> {
    readonly circuits: any;
    readonly witnesses: W;
    readonly initialPrivateState?: PS;
    constructor(witnesses: W, initialPrivateState?: PS);
    initialState(context: any, initialRoot: Uint8Array): {
        context: any;
        state: {
            allowlistRoot: Uint8Array<ArrayBufferLike>;
            issuer: Uint8Array<ArrayBuffer>;
            accessGranted: bigint;
            nullifiers: Set<string>;
        };
    };
}
export declare function parseCompactLedger(state: any): CompactLedger;
export declare const contractReference: {
    contractName: string;
    version: string;
};
export interface PublicLedgerState {
    allowlistRoot: string;
    accessGranted: number;
    issuer: string;
    nullifiers: Set<string>;
    nullifiersCount?: number;
}
export interface PrivateWitnesses {
    secretKey: Uint8Array;
    merklePath: [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array];
    pathDirections: [boolean, boolean, boolean, boolean, boolean];
}
export interface ShadowPassPrivateState {
    readonly secretKey: Uint8Array;
    readonly merklePath: [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array];
    readonly pathDirections: [boolean, boolean, boolean, boolean, boolean];
}
export declare const createShadowPassPrivateState: (secretKey: Uint8Array, merklePath?: [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array], pathDirections?: [boolean, boolean, boolean, boolean, boolean]) => ShadowPassPrivateState;
export declare const witnesses: Witnesses<ShadowPassPrivateState>;
export declare class SecureMemoryPrivateStateProvider {
    private contractAddress;
    private stateMap;
    constructor(contractAddress?: string);
    getPrivateState(): Promise<ShadowPassPrivateState | null>;
    setPrivateState(state: ShadowPassPrivateState): Promise<void>;
    clear(): Promise<void>;
}
export declare function pad32(str: string): Uint8Array;
export declare function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array;
export declare function persistentHash(inputs: Uint8Array[]): Uint8Array;
export declare function computeLeafCommitment(secretKeyBytes: Uint8Array): Uint8Array;
export declare function computeNullifier(secretKeyBytes: Uint8Array): Uint8Array;
export declare function computeMerkleRootFrom(leaf: Uint8Array, path: [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array], directions: [boolean, boolean, boolean, boolean, boolean]): Uint8Array;
export declare class AllowlistMerkleTree {
    leaves: Uint8Array[];
    layers: Uint8Array[][];
    readonly depth: number;
    readonly capacity: number;
    constructor(secretKeysOrLeaves?: Uint8Array[], areSecretKeys?: boolean);
    buildTree(): void;
    getRoot(): Uint8Array;
    getRootHex(): string;
    getWitness(index: number): {
        merklePath: [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array];
        pathDirections: [boolean, boolean, boolean, boolean, boolean];
    };
}
export interface DeployedAllowlistContract {
    readonly contractAddress: string;
    readonly callTx: {
        checkAccess: (privateState: ShadowPassPrivateState) => Promise<{
            txId: string;
            nullifierHex: string;
            accessGranted: number;
        }>;
        publishAllowlist: (newRootHex: string) => Promise<{
            txId: string;
            newRoot: string;
        }>;
    };
    queryState: () => Promise<PublicLedgerState>;
}
export declare class AllowlistContract {
    readonly contractAddress: string;
    private deployedState;
    readonly compactInstance: CompactContract<ShadowPassPrivateState>;
    constructor(contractAddress?: string, initialRoot?: string);
    queryState(): Promise<PublicLedgerState>;
    get callTx(): {
        checkAccess: (privateState: ShadowPassPrivateState) => Promise<{
            txId: string;
            nullifierHex: string;
            accessGranted: number;
        }>;
        publishAllowlist: (newRootHex: string) => Promise<{
            txId: string;
            newRoot: string;
        }>;
    };
}
export declare function findDeployedContract(providersOrAddress?: any, config?: {
    contractAddress?: string;
}): Promise<DeployedAllowlistContract>;
export declare function deployContract(providers?: any, config?: {
    initialRoot?: Uint8Array | string;
    issuerPublicKey?: string;
}): Promise<DeployedAllowlistContract>;
export declare function hexToBytes(hex: string): Uint8Array;
export declare function bytesToHex(bytes: Uint8Array): string;
export declare function sha256Bytes(data: Uint8Array): Uint8Array;
