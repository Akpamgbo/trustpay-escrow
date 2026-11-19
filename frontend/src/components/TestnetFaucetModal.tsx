'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useWalletStore } from '@/store/walletStore';
import {
  estimateTransactionGasFee,
  fetchAccountBalances,
  fundWithFriendbot,
  setupMockUsdcTrustlineAndMint,
  GasFeeEstimate,
  FRIENDBOT_XLM_AMOUNT,
  MOCK_USDC_MINT_AMOUNT,
  LOW_XLM_THRESHOLD,
} from '@/lib/friendbot';

export interface TestnetFaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  countdownDurationSeconds?: number;
}

type FundingStep = 'idle' | 'funding_xlm' | 'minting_usdc' | 'refreshing' | 'complete' | 'error';

export function TestnetFaucetModal({
  isOpen,
  onClose,
  countdownDurationSeconds = 5,
}: TestnetFaucetModalProps) {
  const { address, xlmBalance, usdcBalance, isLowBalance, setBalances } = useWalletStore();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<FundingStep>('idle');
  const [countdown, setCountdown] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasFeeEstimate | null>(null);
  const [loadingGas, setLoadingGas] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshData = useCallback(async () => {
    setLoadingGas(true);
    try {
      const [fee, balances] = await Promise.all([
        estimateTransactionGasFee(),
        address ? fetchAccountBalances(address) : Promise.resolve(null),
      ]);
      setGasEstimate(fee);
      if (balances) {
        setBalances(balances.xlmBalance, balances.usdcBalance);
      }
    } catch {
      // keep existing state on transient error
    } finally {
      setLoadingGas(false);
    }
  }, [address, setBalances]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (step === 'complete' || step === 'error') {
        setStep('idle');
      }
      refreshData();
    }
  }, [isOpen, refreshData]);

  // Live countdown timer while funding is active
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleFundAndMint = async () => {
    if (!address) {
      toast.error('Please connect a Stellar Testnet wallet first.');
      return;
    }

    setErrorMessage(null);
    setStep('funding_xlm');
    setCountdown(countdownDurationSeconds);
    setStatusMessage('Requesting 10,000 test XLM from Stellar Friendbot...');

    try {
      const xlmRes = await fundWithFriendbot(address);
      setStatusMessage(xlmRes.message);

      // Step 2: Establish trustline & mint 1,000 mock USDC
      setStep('minting_usdc');
      setStatusMessage('Establishing USDC trustline & minting 1,000 mock USDC...');
      const usdcRes = await setupMockUsdcTrustlineAndMint(address, { signWithWallet: false });

      // Step 3: Refresh balances in walletStore in real time
      setStep('refreshing');
      setStatusMessage('Syncing updated Testnet balances...');
      let refreshedXlm = (xlmBalance ?? 0) + xlmRes.fundedAmountXlm;
      let refreshedUsdc = (usdcBalance ?? 0) + usdcRes.mintedAmount;

      try {
        const latest = await fetchAccountBalances(address);
        if (latest.exists && latest.xlmBalance > 0) {
          refreshedXlm = latest.xlmBalance;
        } else if (refreshedXlm === 0) {
          refreshedXlm = FRIENDBOT_XLM_AMOUNT;
        }
        refreshedUsdc = Math.max(latest.usdcBalance, (usdcBalance ?? 0) + usdcRes.mintedAmount);
      } catch {
        // Use optimistic funded values if Horizon hasn't propagated yet
        if (refreshedXlm === 0) refreshedXlm = FRIENDBOT_XLM_AMOUNT;
      }

      setBalances(refreshedXlm, refreshedUsdc);
      setStep('complete');
      setCountdown(0);
      setStatusMessage(
        `Wallet funded! Balance updated to ${refreshedXlm.toLocaleString()} XLM & ${refreshedUsdc.toLocaleString()} mock USDC.`
      );
      toast.success('Testnet wallet funded with XLM & 1,000 mock USDC!');
    } catch (err: any) {
      const msg = err?.message || 'Friendbot funding failed. Please try again.';
      setStep('error');
      setCountdown(0);
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  if (!isOpen) return null;

  const isWorking = step === 'funding_xlm' || step === 'minting_usdc' || step === 'refreshing';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Stellar Testnet Faucet and Gas Estimator"
      data-testid="testnet-faucet-modal"
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div className="bg-[#18181b] border border-[#3f3f46] rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#27272a]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 text-white flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
              ⛽
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                Testnet Faucet & Gas Estimator
              </h3>
              <p className="text-xs text-[#a1a1aa]">
                1-click Stellar Friendbot XLM funding + mock USDC minting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close faucet modal"
            className="text-[#a1a1aa] hover:text-white p-1.5 rounded-lg hover:bg-[#27272a] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Low Balance Alert */}
        {(isLowBalance || (xlmBalance !== null && xlmBalance < LOW_XLM_THRESHOLD)) && (
          <div
            data-testid="faucet-low-balance-alert"
            className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200"
          >
            <span className="text-base leading-none">⚠️</span>
            <div>
              <p className="font-bold text-amber-300">Low Testnet XLM Balance Detected</p>
              <p className="text-amber-200/80 mt-0.5">
                Your wallet has less than {LOW_XLM_THRESHOLD} XLM. Fund it with Friendbot below to pay Soroban transaction fees and test escrows.
              </p>
            </div>
          </div>
        )}

        {/* Connected Wallet & Live Balances */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#232326] border border-[#333338]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa] block">
              Testnet XLM
            </span>
            <span
              data-testid="faucet-xlm-balance"
              className="text-xl font-black text-white font-mono mt-1 block"
            >
              {xlmBalance !== null ? `${xlmBalance.toLocaleString()} XLM` : '—'}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#232326] border border-[#333338]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa] block">
              Mock USDC
            </span>
            <span
              data-testid="faucet-usdc-balance"
              className="text-xl font-black text-emerald-400 font-mono mt-1 block"
            >
              {usdcBalance !== null ? `${usdcBalance.toLocaleString()} USDC` : '0 USDC'}
            </span>
          </div>
        </div>

        {/* Automated Gas Fee Estimation Panel */}
        <div
          data-testid="gas-fee-estimator-panel"
          className="p-4 rounded-2xl bg-[#121215] border border-[#27272a] space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#e4e4e7] uppercase tracking-wider">
              Automated Gas Fee Estimation
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                gasEstimate?.congestionLevel === 'high'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : gasEstimate?.congestionLevel === 'moderate'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {loadingGas ? 'Estimating...' : `${gasEstimate?.congestionLevel || 'low'} congestion`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between bg-[#1c1c20] px-3 py-2 rounded-xl border border-[#27272a]">
              <span className="text-[#a1a1aa]">Base Fee:</span>
              <span className="font-mono text-white font-semibold">
                {gasEstimate ? `${gasEstimate.recommendedFeeXlm} XLM` : '0.00001 XLM'}
              </span>
            </div>
            <div className="flex justify-between bg-[#1c1c20] px-3 py-2 rounded-xl border border-[#27272a]">
              <span className="text-[#a1a1aa]">Soroban Est:</span>
              <span className="font-mono text-blue-400 font-semibold">
                ~{gasEstimate ? `${gasEstimate.sorobanEstimatedFeeXlm} XLM` : '0.0100 XLM'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Countdown & Funding Status */}
        {isWorking && (
          <div
            data-testid="faucet-countdown-banner"
            className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-blue-300">Funding Operation in Progress</p>
              <p className="text-[11px] text-blue-200/80">{statusMessage}</p>
            </div>
            <div
              data-testid="faucet-countdown-timer"
              className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600/30 border border-blue-400/40 font-mono text-sm font-black text-white"
            >
              {countdown}s
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div
            data-testid="faucet-success-banner"
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-medium"
          >
            ✓ {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="faucet-error-banner"
            className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-medium"
          >
            ✕ {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2 border-t border-[#27272a]">
          <button
            type="button"
            onClick={handleFundAndMint}
            disabled={isWorking || !address}
            data-testid="fund-friendbot-button"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🚀</span>
            <span>
              {isWorking
                ? `Funding Wallet (${countdown}s)...`
                : `Fund Wallet with Friendbot (+${FRIENDBOT_XLM_AMOUNT.toLocaleString()} XLM & +${MOCK_USDC_MINT_AMOUNT.toLocaleString()} USDC)`}
            </span>
          </button>

          <div className="flex items-center justify-between text-[11px] text-[#71717a] px-1">
            <span className="font-mono truncate max-w-[260px]">
              {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'No wallet connected'}
            </span>
            <button
              type="button"
              onClick={refreshData}
              disabled={loadingGas || isWorking}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              ↻ Refresh Balances
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return mounted && typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
