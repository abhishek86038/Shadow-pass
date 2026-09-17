import { describe, it, expect } from 'vitest';
import {
  computeLeafCommitment,
  computeNullifier,
  bytesToHex,
  hexToBytes,
  witnesses,
  createShadowPassPrivateState,
  MIDNIGHT_CONFIG,
} from '../contract/src/index.js';

describe('Authoritative Midnight Compact Circuit & ZK Allowlist Test Suite', () => {
  const secretKey1Hex = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const secretKey2Hex = 'f9e8d7c6b5a4039281726151413121110f9e8d7c6b5a40392817261514131211';
  const secretKey1Bytes = hexToBytes(secretKey1Hex);
  const secretKey2Bytes = hexToBytes(secretKey2Hex);

  it('Test 1: Pure leaf commitment derivation is deterministic and length-checked', () => {
    const leaf1 = computeLeafCommitment(secretKey1Bytes);
    const leaf2 = computeLeafCommitment(secretKey1Bytes);
    expect(leaf1.length).toBe(32);
    expect(bytesToHex(leaf1)).toEqual(bytesToHex(leaf2));

    const distinctLeaf = computeLeafCommitment(secretKey2Bytes);
    expect(bytesToHex(leaf1)).not.toEqual(bytesToHex(distinctLeaf));
  });

  it('Test 2: Nullifier derivation guarantees one-way replay protection', () => {
    const nullifier1 = computeNullifier(secretKey1Bytes);
    const nullifier2 = computeNullifier(secretKey1Bytes);
    expect(nullifier1.length).toBe(32);
    expect(bytesToHex(nullifier1)).toEqual(bytesToHex(nullifier2));

    // Nullifier must not reveal secretKey or leaf
    const leaf1 = computeLeafCommitment(secretKey1Bytes);
    expect(bytesToHex(nullifier1)).not.toEqual(bytesToHex(leaf1));
    expect(bytesToHex(nullifier1)).not.toEqual(secretKey1Hex);

    const distinctNullifier = computeNullifier(secretKey2Bytes);
    expect(bytesToHex(nullifier1)).not.toEqual(bytesToHex(distinctNullifier));
  });

  it('Test 3: Private witnesses provider extracts witness data without mutation', () => {
    const privateState = createShadowPassPrivateState(secretKey1Bytes);
    const mockContext = { privateState } as any;

    const [stateOut, extractedSecret] = witnesses.secretKey(mockContext);
    expect(stateOut).toBe(privateState);
    expect(bytesToHex(extractedSecret)).toEqual(secretKey1Hex);

    const [, path] = witnesses.merklePath(mockContext);
    expect(path.length).toBe(5);

    const [, directions] = witnesses.pathDirections(mockContext);
    expect(directions.length).toBe(5);
  });

  it('Test 4: Verified Preprod configuration matches authoritative testnet endpoints', () => {
    expect(MIDNIGHT_CONFIG.networkId).toBe('preprod');
    expect(MIDNIGHT_CONFIG.indexerUri).toContain('indexer.preprod.midnight.network');
    expect(MIDNIGHT_CONFIG.nodeRpcUri).toContain('rpc.preprod.midnight.network');
    expect(MIDNIGHT_CONFIG.defaultContractAddress).toBe(
      'f58d3e681578fff354e5391111b384f5dca9f39c9d567bdcf9fff84727ae8f56'
    );
  });
});
