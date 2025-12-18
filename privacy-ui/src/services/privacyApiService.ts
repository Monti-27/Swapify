/**
 * Service to interact with the Privacy Cash API on Railway
 */
export class PrivacyApiService {
  private static readonly API_BASE_URL = 'https://zk-api.up.railway.app';

  /**
   * Create unsigned deposit transaction
   */
  private async createDepositTransaction(params: {
    amount: number;
    senderWallet: string;
    signedMessage: string;
  }): Promise<{
    success: boolean;
    transaction?: string; // Base64 encoded unsigned transaction
    transactionId?: string; // Database transaction ID for tracking
    error?: string;
  }> {
    try {
      console.log(`Creating deposit transaction for ${params.amount} SOL`);

      const response = await fetch(`${PrivacyApiService.API_BASE_URL}/api/privacy/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          senderWallet: params.senderWallet,
          signedMessage: params.signedMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Deposit creation failed: ${response.status}`);
      }

      console.log('Deposit transaction created successfully');
      return {
        success: true,
        transaction: result.transaction,
        transactionId: result.transactionId,
      };
    } catch (error) {
      console.error('Deposit creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Relay signed transaction to network
   */
  private async relayTransaction(params: {
    signedTransaction: string;
    transactionType?: 'deposit' | 'withdraw';
    transactionId?: string;
  }): Promise<{
    success: boolean;
    signature?: string;
    explorerUrl?: string;
    error?: string;
  }> {
    try {
      console.log('Relaying signed transaction to network');

      const response = await fetch(`${PrivacyApiService.API_BASE_URL}/api/privacy/relay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signedTransaction: params.signedTransaction,
          transactionType: params.transactionType || 'deposit',
          transactionId: params.transactionId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Transaction relay failed: ${response.status}`);
      }

      console.log('Transaction relayed successfully:', result.signature);
      return {
        success: true,
        signature: result.signature,
        explorerUrl: result.explorerUrl,
      };
    } catch (error) {
      console.error('Transaction relay failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute privacy withdraw (server-side)
   */
  private async withdraw(params: {
    amount: number;
    senderWallet: string;
    recipient: string;
    signedMessage: string;
  }): Promise<{
    success: boolean;
    transaction?: {
      signature: string;
      amount: { sol: string; lamports: number };
      fee: { sol: string; lamports: number };
      recipient: string;
      sender: string;
      explorerUrl: string;
    };
    error?: string;
  }> {
    try {
      console.log(`Withdrawing ${params.amount} SOL privately to ${params.recipient}`);

      const response = await fetch(`${PrivacyApiService.API_BASE_URL}/api/privacy/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount,
          senderWallet: params.senderWallet,
          recipient: params.recipient,
          signedMessage: params.signedMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Withdraw failed: ${response.status}`);
      }

      console.log('Privacy withdraw successful:', result.signature);
      return {
        success: true,
        transaction: result.transaction,
      };
    } catch (error) {
      console.error('Privacy withdraw failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SOL privately using deposit + withdraw flow
   */
  async sendPrivately(params: {
    recipient: string;
    amount: number;
    senderWallet: string;
    signedMessage: string;
    signTransaction: (transaction: Uint8Array) => Promise<Uint8Array>;
  }): Promise<{
    success: boolean;
    depositSignature?: string;
    withdrawSignature?: string;
    error?: string;
  }> {
    try {
      console.log(`Sending ${params.amount} SOL privately to ${params.recipient}`);

      // Step 1: Create deposit transaction
      const depositTx = await this.createDepositTransaction({
        amount: params.amount,
        senderWallet: params.senderWallet,
        signedMessage: params.signedMessage,
      });

      if (!depositTx.success || !depositTx.transaction) {
        throw new Error(depositTx.error || 'Failed to create deposit transaction');
      }

      // Step 2: Sign transaction with user's wallet
      const unsignedTx = Buffer.from(depositTx.transaction, 'base64');
      const signedTx = await params.signTransaction(unsignedTx);
      const signedTxBase64 = Buffer.from(signedTx).toString('base64');

      // Step 3: Relay signed deposit transaction
      const relayResult = await this.relayTransaction({
        signedTransaction: signedTxBase64,
        transactionType: 'deposit',
        transactionId: depositTx.transactionId,
      });

      if (!relayResult.success) {
        throw new Error(relayResult.error || 'Failed to relay deposit transaction');
      }

      // Step 4: Execute withdraw (server-side)
      const withdrawResult = await this.withdraw({
        amount: params.amount,
        senderWallet: params.senderWallet,
        recipient: params.recipient,
        signedMessage: params.signedMessage,
      });

      if (!withdrawResult.success) {
        throw new Error(withdrawResult.error || 'Failed to execute withdraw');
      }

      return {
        success: true,
        depositSignature: relayResult.signature,
        withdrawSignature: withdrawResult.transaction?.signature,
      };
    } catch (error) {
      console.error('Privacy send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

}

export const privacyApiService = new PrivacyApiService();
