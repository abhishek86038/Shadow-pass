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
export declare const witnesses: {
    secretKey: ({ privateState, }: WitnessContext<any, ShadowPassPrivateState>) => [ShadowPassPrivateState, Uint8Array];
    merklePath: ({ privateState, }: WitnessContext<any, ShadowPassPrivateState>) => [ShadowPassPrivateState, [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array]];
    pathDirections: ({ privateState, }: WitnessContext<any, ShadowPassPrivateState>) => [ShadowPassPrivateState, [boolean, boolean, boolean, boolean, boolean]];
};
export declare class SecureMemoryPrivateStateProvider {
    private contractAddress;
    private stateMap;
    constructor(contractAddress?: string);
    getPrivateState(): Promise<ShadowPassPrivateState | null>;
    setPrivateState(state: ShadowPassPrivateState): Promise<void>;
    clear(): Promise<void>;
}
export declare function computeLeafCommitment(secretKeyBytes: Uint8Array): Uint8Array;
export declare function computeNullifier(secretKeyBytes: Uint8Array): Uint8Array;
export declare function computeMerkleRootFrom(leaf: Uint8Array, path: [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array], directions: [boolean, boolean, boolean, boolean, boolean]): Uint8Array;
export declare function bytesToHex(bytes: Uint8Array): string;
export declare function hexToBytes(hex: string): Uint8Array;
export declare class AllowlistContract {
    readonly contractAddress: string;
    ledger: PublicLedgerState;
    constructor(contractAddress: string, initialRoot?: string, issuer?: string);
    readonly callTx: {
        checkAccess: (privateState: ShadowPassPrivateState) => Promise<{
            txId: string;
            nullifierHex: string;
            accessGranted: number;
        }>;
        publishAllowlist: (callerPublicKey: string, newRoot: Uint8Array) => Promise<{
            newRootHex: string;
        }>;
    };
    queryContractState(): Promise<PublicLedgerState>;
}
export interface DeployedContractInstance {
    contractAddress: string;
    contract: AllowlistContract;
    callTx: AllowlistContract['callTx'];
    queryContractState: () => Promise<PublicLedgerState>;
}
export declare function findDeployedContract(_providers: any, options: {
    contractAddress: string;
    initialRoot?: string;
    issuer?: string;
}): Promise<DeployedContractInstance>;
export declare function deployContract(_providers: any, options: {
    initialRoot: Uint8Array;
    issuerPublicKey?: string;
}): Promise<DeployedContractInstance>;
