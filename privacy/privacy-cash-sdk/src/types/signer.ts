import { PublicKey, VersionedTransaction } from '@solana/web3.js';

/**
 * Interface for wallet signers that can be used with PrivacyCash
 * instead of requiring a raw private key.
 * 
 * This allows integration with wallet management services like Privy
 * that keep private keys secure in a TEE (Trusted Execution Environment).
 */
export interface WalletSigner {
  /**
   * Get the public key of the wallet
   * @returns The wallet's public key
   */
  getPublicKey(): Promise<PublicKey>;
  
  /**
   * Sign a Solana versioned transaction
   * @param tx The transaction to sign
   * @returns The signed transaction
   */
  signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction>;
  
  /**
   * Sign an arbitrary message (for encryption key derivation)
   * @param message The message to sign as Uint8Array
   * @returns The signature bytes as Uint8Array
   */
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

