// ============================================================================
// ShadowPass: Preprod Deployment Contract Witnesses
// ============================================================================

export type ShadowPassPrivateState = {
  readonly secretKey: Uint8Array;
  readonly merklePath: [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array];
  readonly pathDirections: [boolean, boolean, boolean, boolean, boolean];
};

export const createShadowPassPrivateState = (
  secretKey: Uint8Array,
  merklePath: [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array] = [
    new Uint8Array(32),
    new Uint8Array(32),
    new Uint8Array(32),
    new Uint8Array(32),
    new Uint8Array(32),
  ],
  pathDirections: [boolean, boolean, boolean, boolean, boolean] = [false, false, false, false, false]
): ShadowPassPrivateState => ({
  secretKey,
  merklePath,
  pathDirections,
});

export const witnesses = {
  secretKey: ({ privateState }: { privateState: ShadowPassPrivateState }): [ShadowPassPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
  merklePath: ({
    privateState,
  }: {
    privateState: ShadowPassPrivateState;
  }): [ShadowPassPrivateState, [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array]] => [
    privateState,
    privateState.merklePath,
  ],
  pathDirections: ({
    privateState,
  }: {
    privateState: ShadowPassPrivateState;
  }): [ShadowPassPrivateState, [boolean, boolean, boolean, boolean, boolean]] => [
    privateState,
    privateState.pathDirections,
  ],
};
