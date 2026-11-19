import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActiveRole = 'client' | 'freelancer';
export type StellarNetwork = 'TESTNET' | 'PUBLIC';

export const LOW_BALANCE_XLM_THRESHOLD = 2;

interface WalletState {
  address: string | null;
  walletName: string | null;
  activeRole: ActiveRole;
  isClient: boolean;
  isFreelancer: boolean;
  token: string | null;
  network: StellarNetwork;
  xlmBalance: number | null;
  usdcBalance: number | null;
  isLowBalance: boolean;
  setActiveRole: (role: ActiveRole) => void;
  setWalletInfo: (
    address: string,
    isClient?: boolean,
    isFreelancer?: boolean,
    walletName?: string,
    token?: string | null
  ) => void;
  setBalances: (xlmBalance: number | null, usdcBalance?: number | null) => void;
  setNetwork: (network: StellarNetwork) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      walletName: null,
      activeRole: 'client',
      isClient: true,
      isFreelancer: true,
      token: null,
      network: 'TESTNET',
      xlmBalance: null,
      usdcBalance: null,
      isLowBalance: false,
      setActiveRole: (activeRole) => set({ activeRole }),
      setWalletInfo: (
        address,
        isClient = true,
        isFreelancer = true,
        walletName = 'Freighter',
        token = null
      ) => set({ address, isClient, isFreelancer, walletName, token }),
      setBalances: (xlmBalance, usdcBalance) =>
        set((state) => ({
          xlmBalance,
          usdcBalance: usdcBalance !== undefined ? usdcBalance : state.usdcBalance,
          isLowBalance: xlmBalance !== null && xlmBalance < LOW_BALANCE_XLM_THRESHOLD,
        })),
      setNetwork: (network) => set({ network }),
      disconnect: () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
        } catch {
          // ignore network error on logout
        }
        set({
          address: null,
          walletName: null,
          activeRole: 'client',
          isClient: true,
          isFreelancer: true,
          token: null,
          network: 'TESTNET',
          xlmBalance: null,
          usdcBalance: null,
          isLowBalance: false,
        });
      },
    }),
    {
      name: 'trustpay-wallet-storage',
    }
  )
);
