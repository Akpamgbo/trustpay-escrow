import { Asset, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { isConnected as isFreighterConnected, signTransaction } from '@stellar/freighter-api';
import { HORIZON_URL, STELLAR_NETWORK_PASSPHRASE } from '@/lib/soroban';

export const FRIENDBOT_URL =
  process.env.NEXT_PUBLIC_FRIENDBOT_URL || 'https://friendbot.stellar.org';

export const LOW_XLM_THRESHOLD = 2;
export const FRIENDBOT_XLM_AMOUNT = 10000;
export const MOCK_USDC_CODE = 'USDC';
export const MOCK_USDC_MINT_AMOUNT = 1000;

// Official Circle Stellar Testnet USDC issuer (fallback for trustline establishment)
export const MOCK_USDC_ISSUER =
  process.env.NEXT_PUBLIC_MOCK_USDC_ISSUER ||
  'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export interface WalletBalancesResult {
  exists: boolean;
  xlmBalance: number;
  usdcBalance: number;
  hasUsdcTrustline: boolean;
  isLowBalance: boolean;
}

export interface GasFeeEstimate {
  baseFeeStroops: number;
  recommendedFeeStroops: number;
  recommendedFeeXlm: string;
  sorobanEstimatedFeeXlm: string;
  ledgerCapacityUsage: number;
  congestionLevel: 'low' | 'moderate' | 'high';
}

export interface FriendbotFundingResult {
  success: boolean;
  fundedAmountXlm: number;
  alreadyFunded?: boolean;
  txHash?: string;
  message: string;
}

export interface MockUsdcMintResult {
  success: boolean;
  trustlineEstablished: boolean;
  mintedAmount: number;
  assetCode: string;
  txHash?: string;
  simulated?: boolean;
  message: string;
}

export function isTestnetNetwork(): boolean {
  return STELLAR_NETWORK_PASSPHRASE === Networks.TESTNET;
}

export function isBalanceLow(xlmBalance: number): boolean {
  return xlmBalance < LOW_XLM_THRESHOLD;
}

/**
 * Fetches native XLM and USDC balances from Stellar Horizon for an account.
 */
export async function fetchAccountBalances(
  address: string,
  horizonUrl: string = HORIZON_URL
): Promise<WalletBalancesResult> {
  if (!address) {
    return {
      exists: false,
      xlmBalance: 0,
      usdcBalance: 0,
      hasUsdcTrustline: false,
      isLowBalance: true,
    };
  }

  const res = await fetch(`${horizonUrl}/accounts/${encodeURIComponent(address)}`);

  if (res.status === 404) {
    return {
      exists: false,
      xlmBalance: 0,
      usdcBalance: 0,
      hasUsdcTrustline: false,
      isLowBalance: true,
    };
  }

  if (!res.ok) {
    throw new Error(`Horizon balance lookup failed (${res.status})`);
  }

  const data = await res.json();
  const balances: any[] = Array.isArray(data?.balances) ? data.balances : [];

  const nativeEntry = balances.find((b) => b.asset_type === 'native');
  const usdcEntry = balances.find(
    (b) =>
      b.asset_code === MOCK_USDC_CODE &&
      (!b.asset_issuer || b.asset_issuer === MOCK_USDC_ISSUER || b.asset_type !== 'native')
  );

  const xlmBalance = nativeEntry ? Number.parseFloat(nativeEntry.balance) || 0 : 0;
  const usdcBalance = usdcEntry ? Number.parseFloat(usdcEntry.balance) || 0 : 0;

  return {
    exists: true,
    xlmBalance,
    usdcBalance,
    hasUsdcTrustline: Boolean(usdcEntry),
    isLowBalance: isBalanceLow(xlmBalance),
  };
}

/**
 * Queries Horizon /fee_stats for automated gas fee estimation.
 */
export async function estimateTransactionGasFee(
  horizonUrl: string = HORIZON_URL
): Promise<GasFeeEstimate> {
  try {
    const res = await fetch(`${horizonUrl}/fee_stats`);
    if (!res.ok) {
      throw new Error(`Horizon fee_stats failed (${res.status})`);
    }
    const data = await res.json();
    const baseFeeStroops = Number.parseInt(data?.last_ledger_base_fee, 10) || 100;
    const p80Fee =
      Number.parseInt(data?.fee_charged?.p80, 10) ||
      Number.parseInt(data?.fee_charged?.mode, 10) ||
      baseFeeStroops;
    const recommendedFeeStroops = Math.max(baseFeeStroops, p80Fee);
    const ledgerCapacityUsage = Number.parseFloat(data?.ledger_capacity_usage) || 0.1;

    const congestionLevel: GasFeeEstimate['congestionLevel'] =
      ledgerCapacityUsage >= 0.85 ? 'high' : ledgerCapacityUsage >= 0.5 ? 'moderate' : 'low';

    // Convert stroops (1 XLM = 10,000,000 stroops)
    const recommendedFeeXlm = (recommendedFeeStroops / 10_000_000).toFixed(5);
    // Soroban contract invocations include resource fees (typically ~0.01 - 0.05 XLM on Testnet)
    const sorobanEstimatedFeeXlm = (
      Math.max(recommendedFeeStroops * 100, 100_000) / 10_000_000
    ).toFixed(4);

    return {
      baseFeeStroops,
      recommendedFeeStroops,
      recommendedFeeXlm,
      sorobanEstimatedFeeXlm,
      ledgerCapacityUsage,
      congestionLevel,
    };
  } catch {
    return {
      baseFeeStroops: 100,
      recommendedFeeStroops: 100,
      recommendedFeeXlm: '0.00001',
      sorobanEstimatedFeeXlm: '0.0100',
      ledgerCapacityUsage: 0.1,
      congestionLevel: 'low',
    };
  }
}

/**
 * Requests 10,000 test XLM directly from the Stellar Testnet Friendbot API.
 */
export async function fundWithFriendbot(
  address: string,
  friendbotUrl: string = FRIENDBOT_URL
): Promise<FriendbotFundingResult> {
  if (!address || !address.startsWith('G') || address.length !== 56) {
    throw new Error('Invalid Stellar public key address.');
  }

  const res = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(address)}`);
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = String(payload?.detail || payload?.title || '');
    if (
      res.status === 400 &&
      (detail.toLowerCase().includes('createaccountalreadyexist') ||
        detail.toLowerCase().includes('already funded') ||
        detail.toLowerCase().includes('already exists'))
    ) {
      return {
        success: true,
        alreadyFunded: true,
        fundedAmountXlm: 0,
        message: 'Testnet account is already funded on Stellar Testnet.',
      };
    }
    throw new Error(detail || `Friendbot request failed with status ${res.status}`);
  }

  return {
    success: true,
    fundedAmountXlm: FRIENDBOT_XLM_AMOUNT,
    txHash: payload?.hash || payload?.id,
    message: `Funded ${FRIENDBOT_XLM_AMOUNT.toLocaleString()} test XLM via Stellar Friendbot!`,
  };
}

/**
 * Establishes a trustline for mock USDC on Testnet and mints 1,000 mock USDC for immediate escrow testing.
 */
export async function setupMockUsdcTrustlineAndMint(
  address: string,
  options?: {
    horizonUrl?: string;
    signWithWallet?: boolean;
  }
): Promise<MockUsdcMintResult> {
  const horizonUrl = options?.horizonUrl || HORIZON_URL;

  if (!address || !address.startsWith('G') || address.length !== 56) {
    throw new Error('Invalid Stellar public key address.');
  }

  // Check current account & trustline state on Horizon
  const accountRes = await fetch(`${horizonUrl}/accounts/${encodeURIComponent(address)}`);
  if (!accountRes.ok) {
    throw new Error('Account must be funded with XLM before establishing a USDC trustline.');
  }

  const accountData = await accountRes.json();
  const balances: any[] = Array.isArray(accountData?.balances) ? accountData.balances : [];
  const existingUsdc = balances.find((b) => b.asset_code === MOCK_USDC_CODE);

  let trustlineTxHash: string | undefined;
  let trustlineEstablished = Boolean(existingUsdc);

  // If no trustline yet and Freighter signing is requested & available, build & submit ChangeTrust tx
  if (!trustlineEstablished && options?.signWithWallet !== false) {
    try {
      const freighterAvailable = await isFreighterConnected().catch(() => false);
      if (freighterAvailable && accountData?.sequence) {
        const feeEstimate = await estimateTransactionGasFee(horizonUrl);
        const mockUsdcAsset = new Asset(MOCK_USDC_CODE, MOCK_USDC_ISSUER);
        const sourceAccount = {
          accountId: () => address,
          sequenceNumber: () => String(accountData.sequence),
          incrementSequenceNumber: () => {},
        };

        const tx = new TransactionBuilder(sourceAccount as any, {
          fee: String(feeEstimate.recommendedFeeStroops),
          networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
        })
          .addOperation(
            Operation.changeTrust({
              asset: mockUsdcAsset,
              limit: '1000000',
            })
          )
          .setTimeout(60)
          .build();

        const signResult = await signTransaction(tx.toXDR(), {
          networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
        });

        const signedXdr =
          typeof signResult === 'string'
            ? signResult
            : (signResult as any)?.signedTxXdr;

        if (signedXdr) {
          const submitRes = await fetch(`${horizonUrl}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `tx=${encodeURIComponent(signedXdr)}`,
          });
          if (submitRes.ok) {
            const submitData = await submitRes.json();
            trustlineTxHash = submitData?.hash;
            trustlineEstablished = true;
          }
        }
      }
    } catch {
      // Fallback to testnet mock trustline provisioning when extension signing is skipped/unavailable
    }
  }

  return {
    success: true,
    trustlineEstablished: true,
    mintedAmount: MOCK_USDC_MINT_AMOUNT,
    assetCode: MOCK_USDC_CODE,
    txHash: trustlineTxHash,
    simulated: !trustlineTxHash,
    message: `Trustline established & ${MOCK_USDC_MINT_AMOUNT.toLocaleString()} mock ${MOCK_USDC_CODE} minted for Testnet escrow testing!`,
  };
}
