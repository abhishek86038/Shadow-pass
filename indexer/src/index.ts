import express, { Request, Response } from 'express';
import cors from 'cors';
import { PublicLedgerState, MIDNIGHT_CONFIG } from '@shadow-pass/contract';

export const app = express();
app.use(cors());
app.use(express.json());

// Historical indexed events log
export interface IndexedAccessEvent {
  eventId: string;
  timestamp: string;
  networkId: string;
  accessGranted: number;
  allowlistRoot: string;
  issuer: string;
  privacyGuarantee: string;
}

const eventLogs: IndexedAccessEvent[] = [];

/**
 * Sync indexed event from contract state
 */
export function recordIndexedEvent(state: PublicLedgerState): IndexedAccessEvent {
  const newEvent: IndexedAccessEvent = {
    eventId: `evt_${Date.now()}_${state.accessGranted}`,
    timestamp: new Date().toISOString(),
    networkId: MIDNIGHT_CONFIG.networkId,
    accessGranted: state.accessGranted,
    allowlistRoot: state.allowlistRoot,
    issuer: state.issuer,
    privacyGuarantee: 'Zero identity, wallet address, or secret key revealed on-chain.',
  };
  eventLogs.push(newEvent);
  return newEvent;
}

export function getIndexedEvents(): IndexedAccessEvent[] {
  return [...eventLogs];
}

/**
 * Query official Midnight Preprod Indexer GraphQL Service
 */
export async function queryPreprodIndexerGraphQL(
  contractAddress: string = MIDNIGHT_CONFIG.defaultContractAddress
) {
  const query = `
    query GetContract($address: String!) {
      contract(address: $address) {
        address
        state
        blockHeight
        transactionCount
      }
    }
  `;

  const response = await fetch(MIDNIGHT_CONFIG.indexerUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables: { address: contractAddress } }),
  });

  if (!response.ok) {
    throw new Error(`Preprod indexer HTTP error: ${response.status}`);
  }

  const result = await response.json();
  return result.data?.contract;
}

// REST endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    network: MIDNIGHT_CONFIG.networkId,
    indexerEndpoint: MIDNIGHT_CONFIG.indexerUri,
    deployedContract: MIDNIGHT_CONFIG.defaultContractAddress,
  });
});

app.get('/api/contract/state', async (req: Request, res: Response) => {
  try {
    const data = await queryPreprodIndexerGraphQL();
    res.json({ success: true, contract: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/events', (req: Request, res: Response) => {
  res.json({ success: true, events: getIndexedEvents() });
});
