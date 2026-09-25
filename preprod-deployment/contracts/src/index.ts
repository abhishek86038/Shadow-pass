// ============================================================================
// ShadowPass: Preprod Deployment Contract Entry Point
// ============================================================================

export * from './witnesses.js';
import * as Witnesses from './witnesses.js';

export interface PublicLedgerState {
  allowlistRoot: string;
  accessGranted: number;
  issuer: string;
  nullifiers: Set<string>;
}

export class AllowlistContractWrapper {
  constructor(
    public readonly allowlistRoot: string,
    public readonly issuer: string
  ) {}

  public readonly witnesses = Witnesses.witnesses;
}
