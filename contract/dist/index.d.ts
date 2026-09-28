import { Contract as CompactContract, ledger as parseCompactLedger, contractReference, type Witnesses, type ImpureCircuits, type PureCircuits, type Ledger as CompactLedger } from './managed/allowlist/contract/index.js';
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
export { CompactContract, parseCompactLedger, contractReference, type Witnesses, type ImpureCircuits, type PureCircuits, type CompactLedger, };
