import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAccountBalances,
  estimateTransactionGasFee,
  fundWithFriendbot,
  setupMockUsdcTrustlineAndMint,
  FRIENDBOT_XLM_AMOUNT,
  MOCK_USDC_MINT_AMOUNT,
} from './friendbot';

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn().mockResolvedValue(false),
  signTransaction: vi.fn(),
}));

const VALID_TESTNET_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFOGOF2W2GOGC25NC47WG';

describe('friendbot & Horizon helpers (#152)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('detects unfunded 404 Horizon account as 0 XLM and low balance', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ status: 404 }),
    } as Response);

    const res = await fetchAccountBalances(VALID_TESTNET_ADDRESS);
    expect(res.exists).toBe(false);
    expect(res.xlmBalance).toBe(0);
    expect(res.usdcBalance).toBe(0);
    expect(res.isLowBalance).toBe(true);
  });

  it('parses Horizon account balances and flags low XLM (< 2 XLM)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        balances: [
          { asset_type: 'native', balance: '1.5000000' },
          { asset_type: 'credit_alphanum4', asset_code: 'USDC', balance: '250.0000000' },
        ],
      }),
    } as Response);

    const res = await fetchAccountBalances(VALID_TESTNET_ADDRESS);
    expect(res.exists).toBe(true);
    expect(res.xlmBalance).toBe(1.5);
    expect(res.usdcBalance).toBe(250);
    expect(res.hasUsdcTrustline).toBe(true);
    expect(res.isLowBalance).toBe(true);
  });

  it('estimates transaction gas fee from Horizon /fee_stats', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        last_ledger_base_fee: '100',
        fee_charged: { p80: '250', mode: '100' },
        ledger_capacity_usage: '0.62',
      }),
    } as Response);

    const fee = await estimateTransactionGasFee();
    expect(fee.baseFeeStroops).toBe(100);
    expect(fee.recommendedFeeStroops).toBe(250);
    expect(fee.congestionLevel).toBe('moderate');
    expect(fee.recommendedFeeXlm).toBe('0.00003');
  });

  it('funds wallet with 10,000 test XLM via Friendbot API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hash: 'tx-friendbot-abc123' }),
    } as Response);

    const res = await fundWithFriendbot(VALID_TESTNET_ADDRESS);
    expect(res.success).toBe(true);
    expect(res.fundedAmountXlm).toBe(FRIENDBOT_XLM_AMOUNT);
    expect(res.txHash).toBe('tx-friendbot-abc123');
  });

  it('handles already-funded Friendbot response gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'createAccountAlreadyExist' }),
    } as Response);

    const res = await fundWithFriendbot(VALID_TESTNET_ADDRESS);
    expect(res.success).toBe(true);
    expect(res.alreadyFunded).toBe(true);
  });

  it('establishes mock USDC trustline and mints 1,000 mock USDC', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        sequence: '123456',
        balances: [{ asset_type: 'native', balance: '10000.0000000' }],
      }),
    } as Response);

    const res = await setupMockUsdcTrustlineAndMint(VALID_TESTNET_ADDRESS, {
      signWithWallet: false,
    });
    expect(res.success).toBe(true);
    expect(res.trustlineEstablished).toBe(true);
    expect(res.mintedAmount).toBe(MOCK_USDC_MINT_AMOUNT);
    expect(res.assetCode).toBe('USDC');
  });
});
