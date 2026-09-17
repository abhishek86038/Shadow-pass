export type ContractAddress = string;
export type WitnessContext<L, PS> = {
    ledger: L;
    privateState: PS;
    contractAddress: ContractAddress;
};
export type MidnightProvider = any;
export type WalletProvider = any;
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
    secretKey: ({ privateState }: WitnessContext<any, ShadowPassPrivateState>) => [ShadowPassPrivateState, Uint8Array];
    merklePath: ({ privateState, }: WitnessContext<any, ShadowPassPrivateState>) => [ShadowPassPrivateState, [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array]];
    pathDirections: ({ privateState, }: WitnessContext<any, ShadowPassPrivateState>) => [ShadowPassPrivateState, [boolean, boolean, boolean, boolean, boolean]];
};
export declare function computeLeafCommitment(secretKeyBytes: Uint8Array): Uint8Array;
export declare function computeNullifier(secretKeyBytes: Uint8Array): Uint8Array;
export declare function bytesToHex(bytes: Uint8Array): string;
export declare function hexToBytes(hex: string): Uint8Array;
