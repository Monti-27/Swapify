import axios from "axios";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: any[];
}

export interface JupiterSwapInstruction {
  data: string; // Base64 encoded
  accounts: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  // Additional instructions that need to be added to the transaction
  setupInstructions?: Array<{
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  }>;
  cleanupInstruction?: {
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  };
}

export interface SwapInstructionsResponse {
  swapInstruction: {
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  };
  setupInstructions?: Array<{
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  }>;
  computeBudgetInstructions?: Array<{
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  }>;
  otherInstructions?: Array<{
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  }>;
  cleanupInstruction?: {
    programId: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  };
  addressLookupTableAddresses?: string[];
}

export class JupiterService {
  private swapApiUrl: string;

  constructor(private apiUrl: string) {
    // Swap instructions endpoint is on /swap/v1
    this.swapApiUrl = apiUrl.replace("/v6", "/swap/v1");
  }

  /**
   * Get a quote from Jupiter V6 API
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: string,
    slippageBps: number = 50,
    platformFeeBps?: number
  ): Promise<JupiterQuote | null> {
    try {
      const params: any = {
        inputMint,
        outputMint,
        amount,
        slippageBps,
      };
      
      // Add platformFeeBps if provided (for Jupiter's built-in fee handling)
      if (platformFeeBps !== undefined) {
        params.platformFeeBps = platformFeeBps;
      }
      
      const response = await axios.get(`${this.apiUrl}/quote`, {
        params,
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Error getting Jupiter quote:`, error);
      return null;
    }
  }

  /**
   * Get swap instruction from Jupiter using Ultra API /order endpoint
   * This extracts the swap instruction from the complete transaction
   * @param inputMint - Input token mint
   * @param outputMint - Output token mint
   * @param amount - Amount to swap
   * @param taker - The taker public key (escrow token account in our case)
   * @param destinationTokenAccount - Destination token account
   * @param slippageBps - Slippage in basis points
   */
  async getSwapInstructionFromUltra(
    inputMint: string,
    outputMint: string,
    amount: string,
    taker: string,
    destinationTokenAccount: string,
    slippageBps: number = 50
  ): Promise<JupiterSwapInstruction | null> {
    try {
      const ultraApiUrl = this.apiUrl.replace("/v6", "/ultra/v1");
      
      const response = await axios.get(`${ultraApiUrl}/order`, {
        params: {
          inputMint,
          outputMint,
          amount,
          taker,
          slippageBps,
        },
      });

      if (!response.data.transaction) {
        console.error("No transaction in Ultra API response:", response.data);
        return null;
      }

      // Parse the transaction to extract the swap instruction
      const transaction = Transaction.from(Buffer.from(response.data.transaction, "base64"));
      
      // Find the Jupiter swap instruction (usually the largest instruction)
      // Jupiter swap instruction typically has the most accounts
      let swapIx: TransactionInstruction | null = null;
      let maxAccounts = 0;

      for (const ix of transaction.instructions) {
        // Check if it's a Jupiter program instruction
        if (ix.programId.toString() === "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4") {
          if (ix.keys.length > maxAccounts) {
            maxAccounts = ix.keys.length;
            swapIx = ix;
          }
        }
      }

      if (!swapIx) {
        console.error("Could not find Jupiter swap instruction in transaction");
        return null;
      }

      // Extract setup instructions (non-Jupiter instructions before swap)
      const setupInstructions: any[] = [];
      let foundSwap = false;
      
      for (const ix of transaction.instructions) {
        if (ix === swapIx) {
          foundSwap = true;
          continue;
        }
        if (!foundSwap && ix.programId.toString() !== "ComputeBudget111111111111111111111111111111") {
          setupInstructions.push({
            programId: ix.programId.toString(),
            accounts: ix.keys.map((k) => ({
              pubkey: k.pubkey.toString(),
              isSigner: k.isSigner,
              isWritable: k.isWritable,
            })),
            data: ix.data.toString("base64"),
          });
        }
      }

      // Extract cleanup instruction (instructions after swap, typically SOL unwrap)
      let cleanupInstruction: any = null;
      foundSwap = false;
      
      for (const ix of transaction.instructions) {
        if (ix === swapIx) {
          foundSwap = true;
          continue;
        }
        if (foundSwap && ix.programId.toString() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
          // Token program instruction after swap is likely cleanup
          cleanupInstruction = {
            programId: ix.programId.toString(),
            accounts: ix.keys.map((k) => ({
              pubkey: k.pubkey.toString(),
              isSigner: k.isSigner,
              isWritable: k.isWritable,
            })),
            data: ix.data.toString("base64"),
          };
        }
      }

      return {
        data: swapIx.data.toString("base64"),
        accounts: swapIx.keys.map((k) => ({
          pubkey: k.pubkey.toString(),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        setupInstructions: setupInstructions.length > 0 ? setupInstructions : undefined,
        cleanupInstruction,
      };
    } catch (error) {
      console.error(`❌ Error getting Jupiter swap instruction from Ultra API:`, error);
      if (axios.isAxiosError(error)) {
        console.error("Response:", error.response?.data);
      }
      return null;
    }
  }

  /**
   * Get swap instruction from Jupiter using /swap-instructions endpoint (legacy)
   * @param userPublicKey - The public key that owns the input token account (escrow token account in our case)
   * @param quote - The quote response from getQuote
   * @param destinationTokenAccount - Optional destination token account (if not provided, uses user's ATA)
   * @param asLegacyTransaction - Whether to use legacy transaction format
   * @param feeAccount - Optional fee account for platform fees (required when platformFeeBps is set in quote)
   */
  async getSwapInstruction(
    userPublicKey: string,
    quote: JupiterQuote,
    destinationTokenAccount?: string,
    asLegacyTransaction: boolean = false,
    feeAccount?: string
  ): Promise<JupiterSwapInstruction | null> {
    try {
      const requestBody: any = {
        userPublicKey,
        quoteResponse: quote,
        asLegacyTransaction,
        wrapAndUnwrapSol: false, // Set to false for CPI - handle WSOL separately
        dynamicComputeUnitLimit: true,
        skipUserAccountsRpcCalls: true, // Critical for CPI - skip RPC calls
      };

      // Add destination token account if provided
      if (destinationTokenAccount) {
        requestBody.destinationTokenAccount = destinationTokenAccount;
      }
      
      // Add feeAccount if provided (required when platformFeeBps is set in quote)
      if (feeAccount) {
        requestBody.feeAccount = feeAccount;
      }

      const response = await axios.post<SwapInstructionsResponse>(
        `${this.swapApiUrl}/swap-instructions`,
        requestBody
      );

      const swapInstructions = response.data;

      // Return the swap instruction with setup/cleanup instructions
      // Note: The swapInstruction is used for CPI
      // Setup and cleanup instructions need to be added to the transaction before/after the CPI
      return {
        data: swapInstructions.swapInstruction.data,
        accounts: swapInstructions.swapInstruction.accounts,
        setupInstructions: swapInstructions.setupInstructions,
        cleanupInstruction: swapInstructions.cleanupInstruction,
      };
    } catch (error) {
      console.error(`❌ Error getting Jupiter swap instruction:`, error);
      if (axios.isAxiosError(error)) {
        console.error("Response:", error.response?.data);
      }
      return null;
    }
  }

  /**
   * Get order from Jupiter Ultra API (alternative method)
   */
  async getOrder(
    inputMint: string,
    outputMint: string,
    amount: string,
    taker?: string,
    slippageBps: number = 50
  ): Promise<any | null> {
    try {
      const response = await axios.get(`${this.apiUrl.replace("/v6", "/ultra/v1")}/order`, {
        params: {
          inputMint,
          outputMint,
          amount,
          taker,
          slippageBps,
        },
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Error getting Jupiter order:`, error);
      return null;
    }
  }
}

