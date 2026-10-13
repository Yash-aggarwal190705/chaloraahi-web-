export type WalletScreen =
  | 'wallet-home' | 'wallet-add' | 'wallet-history'
  | 'wallet-rider-home' | 'wallet-rider-history'
  | 'wallet-withdraw' | 'wallet-withdraw-bank' | 'wallet-withdraw-pending' | 'wallet-withdraw-success'

export const WALLET_SCREENS: WalletScreen[] = [
  'wallet-home', 'wallet-add', 'wallet-history',
  'wallet-rider-home', 'wallet-rider-history',
  'wallet-withdraw', 'wallet-withdraw-bank', 'wallet-withdraw-pending', 'wallet-withdraw-success',
]
