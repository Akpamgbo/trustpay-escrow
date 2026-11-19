import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestnetFaucetModal } from './TestnetFaucetModal';
import { useWalletStore } from '@/store/walletStore';
import * as friendbotLib from '@/lib/friendbot';

const MOCK_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFOGOF2W2GOGC25NC47WG';

describe('TestnetFaucetModal (#152)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useWalletStore.getState().disconnect();
    useWalletStore.getState().setWalletInfo(MOCK_ADDRESS, true, true, 'Freighter');
    useWalletStore.getState().setBalances(0.5, 0);

    vi.spyOn(friendbotLib, 'estimateTransactionGasFee').mockResolvedValue({
      baseFeeStroops: 100,
      recommendedFeeStroops: 100,
      recommendedFeeXlm: '0.00001',
      sorobanEstimatedFeeXlm: '0.0100',
      ledgerCapacityUsage: 0.1,
      congestionLevel: 'low',
    });

    vi.spyOn(friendbotLib, 'fetchAccountBalances').mockResolvedValue({
      exists: true,
      xlmBalance: 0.5,
      usdcBalance: 0,
      hasUsdcTrustline: false,
      isLowBalance: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays low-balance alert and automated gas fee estimator when balance < 2 XLM', async () => {
    render(<TestnetFaucetModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('faucet-low-balance-alert')).toBeInTheDocument();
    expect(screen.getByTestId('gas-fee-estimator-panel')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/0\.00001 XLM/i)).toBeInTheDocument();
    });
  });

  it('displays live countdown timer during funding and updates walletStore balances in real time', async () => {
    let resolveFriendbot!: (value: friendbotLib.FriendbotFundingResult) => void;
    const friendbotPromise = new Promise<friendbotLib.FriendbotFundingResult>((resolve) => {
      resolveFriendbot = resolve;
    });

    vi.spyOn(friendbotLib, 'fundWithFriendbot').mockReturnValue(friendbotPromise);
    vi.spyOn(friendbotLib, 'setupMockUsdcTrustlineAndMint').mockResolvedValue({
      success: true,
      trustlineEstablished: true,
      mintedAmount: 1000,
      assetCode: 'USDC',
      message: 'Minted 1,000 mock USDC',
    });

    render(
      <TestnetFaucetModal isOpen={true} onClose={vi.fn()} countdownDurationSeconds={5} />
    );

    const fundBtn = screen.getByTestId('fund-friendbot-button');
    fireEvent.click(fundBtn);

    // Countdown timer should appear while funding operation is in progress
    expect(await screen.findByTestId('faucet-countdown-timer')).toHaveTextContent('5s');

    // Update fetchAccountBalances mock for post-funding sync
    vi.spyOn(friendbotLib, 'fetchAccountBalances').mockResolvedValue({
      exists: true,
      xlmBalance: 10000.5,
      usdcBalance: 1000,
      hasUsdcTrustline: true,
      isLowBalance: false,
    });

    resolveFriendbot({
      success: true,
      fundedAmountXlm: 10000,
      message: 'Funded 10,000 test XLM',
    });

    await waitFor(() => {
      expect(screen.getByTestId('faucet-success-banner')).toBeInTheDocument();
    });

    // walletStore must be updated in real time without page refresh
    const state = useWalletStore.getState();
    expect(state.xlmBalance).toBe(10000.5);
    expect(state.usdcBalance).toBe(1000);
    expect(state.isLowBalance).toBe(false);
  });
});
