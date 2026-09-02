import express, { Request, Response } from 'express';
import cors from 'cors';
import { AllowlistContract, PublicLedgerState } from '@shadow-pass/contract';

export const app = express();
app.use(cors());
app.use(express.json());

// Initialize indexer connected contract instance
const adminAddress = '0xadmin_pubkey_11223344556677889900aabbccddeeff11223344556677889900aabb';
export const indexedContract = new AllowlistContract(adminAddress, 8);

// Historical indexed events log
export interface IndexedAccessEvent {
  eventId: string;
  timestamp: string;
  blockHeight: number;
  accessGranted: boolean;
  eventNonce: number;
  allowlistRoot: string;
  privacyGuarantee: string;
}

const eventLogs: IndexedAccessEvent[] = [];
let lastProcessedNonce = 0;

/**
 * Poll or sync contract state to emit indexed events
 */
export function syncIndexerEvents(): IndexedAccessEvent[] {
  const state: PublicLedgerState = indexedContract.getPublicLedgerState();

  if (state.lastEventNonce > lastProcessedNonce) {
    const newEvent: IndexedAccessEvent = {
      eventId: `evt_${Date.now()}_${state.lastEventNonce}`,
      timestamp: new Date().toISOString(),
      blockHeight: 1000 + state.lastEventNonce,
      accessGranted: state.accessGranted,
      eventNonce: state.lastEventNonce,
      allowlistRoot: state.allowlistRoot,
      privacyGuarantee: 'Zero identity or member address revealed on-chain.'
    };
    eventLogs.push(newEvent);
    lastProcessedNonce = state.lastEventNonce;
  }

  return eventLogs;
}

// REST Endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ShadowPass Midnight Event Indexer',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req: Request, res: Response) => {
  syncIndexerEvents();
  const state = indexedContract.getPublicLedgerState();
  res.json({
    contractAddress: 'midnight1contract_shadowpass_allowlist_v1',
    accessGranted: state.accessGranted,
    allowlistRoot: state.allowlistRoot,
    registeredCount: state.registeredCount,
    lastEventNonce: state.lastEventNonce,
    adminIdentity: state.adminIdentity
  });
});

app.get('/api/events', (req: Request, res: Response) => {
  syncIndexerEvents();
  res.json({
    totalEvents: eventLogs.length,
    events: eventLogs
  });
});

// Start server if executed directly
const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[ShadowPass Indexer] Running on http://localhost:${PORT}`);
  });
}
