// ============================================================================
// Official Midnight Preprod Smart Contract Deployment Script
// Protocol: ShadowPass (allowlist.compact)
// ============================================================================

import fs from 'fs';
import path from 'path';
import {
  MIDNIGHT_CONFIG,
  deployContract,
  computeLeafCommitment,
  computeMerkleRootFrom,
  hexToBytes,
  bytesToHex,
} from '../contract/src/index.js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

async function main() {
  console.log('================================================================');
  console.log('   Midnight Preprod Smart Contract Deployment');
  console.log('   Contract: allowlist.compact');
  console.log('================================================================\n');

  console.log('🌐 Network Configuration:');
  console.log(`   Network ID:        ${MIDNIGHT_CONFIG.networkId}`);
  console.log(`   Node RPC:          ${MIDNIGHT_CONFIG.nodeRpcUri}`);
  console.log(`   GraphQL Indexer:   ${MIDNIGHT_CONFIG.indexerUri}`);
  console.log(`   Proof Server:      ${MIDNIGHT_CONFIG.proofServerUri}\n`);

  // Initial seed member for depth-5 allowlist root
  const initialSecretKey = hexToBytes('a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90');
  const initialLeaf = computeLeafCommitment(initialSecretKey);
  const emptySibling = new Uint8Array(32);
  const initialMerklePath: [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array] = [
    emptySibling,
    emptySibling,
    emptySibling,
    emptySibling,
    emptySibling,
  ];
  const initialDirections: [boolean, boolean, boolean, boolean, boolean] = [false, false, false, false, false];
  const initialRoot = computeMerkleRootFrom(initialLeaf, initialMerklePath, initialDirections);

  console.log(`🌲 Initial Merkle Root (Depth 5):`);
  console.log(`   0x${bytesToHex(initialRoot)}\n`);

  console.log('⏳ Executing deployContract() via Midnight JS Protocol...');
  const deployed = await deployContract(null, {
    initialRoot,
    issuerPublicKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
  });

  const state = await deployed.queryContractState();

  console.log('\n================================================================');
  console.log('   CONTRACT DEPLOYMENT RECORD');
  console.log('================================================================\n');
  console.log(`📌 Contract Address: ${deployed.contractAddress}`);
  console.log(`🔗 Allowlist Merkle Root: 0x${state.allowlistRoot}`);
  console.log(`👑 Issuer Public Key: ${state.issuer}`);
  console.log(`🛡️ Access Granted Initial Count: ${state.accessGranted}`);
  console.log(`🌐 Midnight Explorer URL:`);
  console.log(`   https://preprod.midnightexplorer.com/contracts/0x${deployed.contractAddress}\n`);

  // Save deployment artifact
  const deploymentRecord = {
    contractAddress: deployed.contractAddress,
    networkId: MIDNIGHT_CONFIG.networkId,
    allowlistRoot: '0x' + state.allowlistRoot,
    issuer: state.issuer,
    explorerUrl: `https://preprod.midnightexplorer.com/contracts/0x${deployed.contractAddress}`,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync('deployed_contract.json', JSON.stringify(deploymentRecord, null, 2));
  console.log('💾 Written deployment artifact to deployed_contract.json');
}

main().catch((err) => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
