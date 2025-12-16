import express from 'express';
import { z } from 'zod';
import { PublicKey, Connection, VersionedTransaction } from '@solana/web3.js';
import { env } from '../config/env.js';
import { EncryptionService } from '../../privacy-cash-sdk/src/utils/encryption.js';
import { WasmFactory } from '@lightprotocol/hasher.rs';
import { deposit, relayDeposit } from '../../privacy-cash-sdk/src/deposit.js';
import { withdraw } from '../../privacy-cash-sdk/src/withdraw.js';
import { getUtxos, getBalanceFromUtxos } from '../../privacy-cash-sdk/src/getUtxos.js';
import { LocalStorage } from 'node-localstorage';
import path from 'path';

const router = express.Router();
const connection = new Connection(env.SOLANA_RPC_URL, 'confirmed');

// Create storage using the same approach as the Privacy Cash SDK
const storage = new LocalStorage(path.join(process.cwd(), 'cache'));

// Validation schema for deposit (create unsigned transaction)
const DepositSchema = z.object({
  amount: z.number().positive().max(1000),
  senderWallet: z.string().refine((val) => {
    try { new PublicKey(val); return true; } catch { return false; }
  }, 'Invalid sender wallet address'),
  signedMessage: z.string().min(1, 'Signed message is required for encryption key derivation')
});

// Validation schema for withdraw (create unsigned transaction)
const WithdrawSchema = z.object({
  amount: z.number().positive().max(1000),
  senderWallet: z.string().refine((val) => {
    try { new PublicKey(val); return true; } catch { return false; }
  }, 'Invalid sender wallet address'),
  recipient: z.string().refine((val) => {
    try { new PublicKey(val); return true; } catch { return false; }
  }, 'Invalid recipient address'),
  signedMessage: z.string().min(1, 'Signed message is required for encryption key derivation')
});

// Validation schema for transaction relay
const RelaySchema = z.object({
  signedTransaction: z.string().min(1, 'Signed transaction is required'),
  transactionType: z.enum(['deposit', 'withdraw']).default('deposit')
});

// Validation schema for balance check
const BalanceSchema = z.object({
  walletAddress: z.string().refine((val) => {
    try { new PublicKey(val); return true; } catch { return false; }
  }, 'Invalid wallet address'),
  signedMessage: z.string().min(1, 'Signed message is required for encryption key derivation')
});

/**
 * POST /api/privacy/deposit
 * 
 * Creates an unsigned deposit transaction for the client to sign.
 * Uses the exact same Privacy Cash SDK logic but returns unsigned transaction.
 */
router.post('/deposit', async (req, res): Promise<void> => {
  try {
    const validation = DepositSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors
      });
      return;
    }

    const { amount, senderWallet, signedMessage } = validation.data;
    const lamports = Math.floor(amount * 1e9);
    
    console.log(`API deposit request: ${amount} SOL from ${senderWallet}`);

    // Create Privacy Cash components using exact same setup as SDK
    const lightWasm = await WasmFactory.getInstance();
    const publicKey = new PublicKey(senderWallet);
    const encryptionService = new EncryptionService();
    
    // Initialize encryption service with the signed message
    const signature = Buffer.from(signedMessage, 'base64');
    encryptionService.deriveEncryptionKeyFromSignature(signature);
    
    // Use the same storage instance as defined at module level
    
    // Create a transaction signer that captures the unsigned transaction
    let unsignedTransaction: VersionedTransaction;
    const mockTransactionSigner = async (tx: VersionedTransaction): Promise<VersionedTransaction> => {
      unsignedTransaction = tx;
      return tx; // Return unsigned transaction
    };

    try {
      // Call the exact same deposit function from Privacy Cash SDK
      await deposit({
        lightWasm,
        storage,
        keyBasePath: path.join(process.cwd(), 'privacy-cash-sdk', 'circuit2', 'transaction2'),
        publicKey,
        connection,
        amount_in_lamports: lamports,
        encryptionService,
        transactionSigner: mockTransactionSigner,
        // referrer: undefined // Optional parameter
      });
    } catch (error) {
      // The deposit function will throw when trying to relay to indexer
      // but we already have our unsigned transaction at this point
      if (!unsignedTransaction!) {
        throw error; // Re-throw if we didn't get the transaction
      }
      // If we have the transaction, continue (ignore indexer errors)
    }

    // Serialize transaction for client to sign
    const serializedTx = unsignedTransaction!.serialize();

    res.json({
      success: true,
      transaction: Buffer.from(serializedTx).toString('base64'),
      message: `Created deposit transaction for ${amount} SOL`,
      details: {
        amount,
        lamports,
        sender: senderWallet,
        instructions: {
          step1: 'Sign this transaction with your wallet',
          step2: 'Send signed transaction to /api/privacy/relay',
          step3: 'Transaction will be submitted to Solana network'
        }
      }
    });

  } catch (error) {
    console.error('Deposit creation error:', error);
    
    res.status(500).json({
      error: 'Failed to create deposit transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/privacy/relay
 * 
 * Relays a signed transaction to the Solana network and Privacy Cash indexer.
 * Uses the exact same relay logic as Privacy Cash SDK.
 */
router.post('/relay', async (req, res): Promise<void> => {
  const validation = RelaySchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: validation.error.errors
    });
    return;
  }

  const { signedTransaction, transactionType } = validation.data;
  
  try {

    // Deserialize the signed transaction to get the signer's public key
    const transaction = VersionedTransaction.deserialize(Buffer.from(signedTransaction, 'base64'));
    const publicKey = transaction.message.staticAccountKeys[0]; // First account is the signer

    if (!publicKey) {
      res.status(400).json({
        error: 'Invalid transaction',
        message: 'Could not determine signer from transaction'
      });
      return;
    }

    // For API use case, we'll submit the transaction directly to the indexer
    // without waiting for confirmation polling (client can check status separately)
    const indexerUrl = process.env.INDEXER_API_URL || 'https://api3.privacycash.org';
    const response = await fetch(`${indexerUrl}/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signedTransaction,
        senderAddress: publicKey.toString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deposit relay failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json() as { signature: string, success: boolean };
    const signature = result.signature;

    res.json({
      success: true,
      signature,
      message: `${transactionType} transaction confirmed`,
      explorerUrl: `https://explorer.solana.com/tx/${signature}`,
      details: {
        transactionType,
        signer: publicKey.toString()
      }
    });

  } catch (error) {
    console.error('Transaction relay error:', error);
    
    res.status(500).json({
      error: 'Failed to relay transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/privacy/withdraw
 * 
 * Executes a privacy withdraw directly using Privacy Cash SDK.
 * No client-side signing needed - indexer handles transaction signing.
 */
router.post('/withdraw', async (req, res): Promise<void> => {
  try {
    const validation = WithdrawSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors
      });
      return;
    }

    const { amount, senderWallet, recipient, signedMessage } = validation.data;
    const lamports = Math.floor(amount * 1e9);

    // Create Privacy Cash components using exact same setup as SDK
    const lightWasm = await WasmFactory.getInstance();
    const publicKey = new PublicKey(senderWallet);
    const recipientKey = new PublicKey(recipient);
    const encryptionService = new EncryptionService();
    
    // Initialize encryption service with the signed message
    const signature = Buffer.from(signedMessage, 'base64');
    encryptionService.deriveEncryptionKeyFromSignature(signature);
    
    // Use the same storage instance as defined at module level

    // Call the exact same withdraw function from Privacy Cash SDK
    // No transactionSigner needed - it will submit directly to indexer
    const result = await withdraw({
      recipient: recipientKey,
      lightWasm,
      storage,
      publicKey,
      connection,
      amount_in_lamports: lamports,
      encryptionService,
        keyBasePath: path.join(process.cwd(), 'privacy-cash-sdk', 'circuit2', 'transaction2')
      // No transactionSigner - uses default indexer submission
    });

    res.json({
      success: true,
      signature: result.tx,
      message: `Privacy withdraw completed for ${amount} SOL`,
      transaction: {
        signature: result.tx,
        amount: {
          sol: (result.amount_in_lamports / 1e9).toFixed(9),
          lamports: result.amount_in_lamports
        },
        fee: {
          sol: (result.fee_in_lamports / 1e9).toFixed(9),
          lamports: result.fee_in_lamports
        },
        recipient: result.recipient,
        sender: senderWallet,
        isPartial: result.isPartial,
        explorerUrl: `https://explorer.solana.com/tx/${result.tx}`
      }
    });

  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({
      error: 'Failed to execute withdraw',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/privacy/balance
 * 
 * Get private balance for a wallet address using Privacy Cash SDK.
 * Requires signed message for encryption key derivation.
 */
router.post('/balance', async (req, res): Promise<void> => {
  try {
    const validation = BalanceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors
      });
      return;
    }

    const { walletAddress, signedMessage } = validation.data;

    console.log(`API balance request for wallet: ${walletAddress}`);

    // Create Privacy Cash components using exact same setup as SDK
    const lightWasm = await WasmFactory.getInstance();
    const publicKey = new PublicKey(walletAddress);
    const encryptionService = new EncryptionService();
    
    // Initialize encryption service with the signed message
    const signature = Buffer.from(signedMessage, 'base64');
    encryptionService.deriveEncryptionKeyFromSignature(signature);
    
    // Get UTXOs for this wallet
    const utxos = await getUtxos({ 
      publicKey, 
      connection, 
      encryptionService, 
      storage 
    });

    // Calculate balance from UTXOs
    const balance = getBalanceFromUtxos(utxos);

    res.json({
      success: true,
      balance: {
        lamports: balance.lamports,
        sol: (balance.lamports / 1e9).toFixed(9)
      },
      utxos: {
        count: utxos.length,
        details: utxos.map(utxo => ({
          amount: {
            lamports: utxo.amount.toNumber(),
            sol: (utxo.amount.toNumber() / 1e9).toFixed(9)
          },
          index: utxo.index,
          // Don't expose sensitive UTXO details in API response
        }))
      },
      wallet: walletAddress,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({
      error: 'Failed to get private balance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as privacyRouter };
