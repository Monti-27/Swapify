import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { deposit } from './deposit.js';
import { getBalanceFromUtxos, getUtxos, localstorageKey } from './getUtxos.js';

import { LSK_ENCRYPTED_OUTPUTS, LSK_FETCH_OFFSET } from './utils/constants.js';
import { logger, type LoggerFn, setLogger } from './utils/logger.js';
import { EncryptionService } from './utils/encryption.js';
import { WasmFactory } from '@lightprotocol/hasher.rs';
import bs58 from 'bs58'
import { withdraw } from './withdraw.js';
import { LocalStorage } from "node-localstorage";
import path from 'node:path'
import { WalletSigner } from './types/signer.js';

let storage = new LocalStorage(path.join(process.cwd(), "cache"));

// Export WalletSigner interface for use by adapters
export type { WalletSigner } from './types/signer.js';

export class PrivacyCash {
    private connection: Connection
    public publicKey!: PublicKey // Definite assignment assertion - always initialized in constructor (keypair) or initialize() (signer)
    private encryptionService: EncryptionService
    private keypair: Keypair | null = null
    private signer: WalletSigner | null = null
    private isRuning?: boolean = false
    private status: string = ''
    private initialized: boolean = false
    
    constructor({ RPC_url, owner, signer, enableDebug }: {
        RPC_url: string,
        owner?: string | number[] | Uint8Array | Keypair,
        signer?: WalletSigner,
        enableDebug?: boolean
    }) {
        // Validate that either owner or signer is provided, but not both
        if (!owner && !signer) {
            throw new Error('Either "owner" (private key) or "signer" must be provided')
        }
        if (owner && signer) {
            throw new Error('Cannot provide both "owner" and "signer". Use one or the other.')
        }

        this.connection = new Connection(RPC_url, 'confirmed')
        this.encryptionService = new EncryptionService();
        
        if (signer) {
            // Use signer-based approach
            this.signer = signer
            // Public key will be set during initialization
        } else if (owner) {
            // Use keypair-based approach (backward compatible)
            let keypair = getSolanaKeypair(owner)
            if (!keypair) {
                throw new Error('param "owner" is not a valid Private Key or Keypair')
            }
            this.keypair = keypair
            this.publicKey = keypair.publicKey
            this.encryptionService.deriveEncryptionKeyFromWallet(this.keypair);
        }
        
        if (!enableDebug) {
            this.startStatusRender()
            this.setLogger((level, message) => {
                if (level == 'info') {
                    this.status = message
                } else if (level == 'error') {
                    console.log('error message: ', message)
                }
            })
        }
    }

    /**
     * Initialize the PrivacyCash instance when using a signer.
     * This must be called before using deposit/withdraw/getPrivateBalance when using a signer.
     * @returns Promise that resolves when initialization is complete
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return
        }
        
        if (this.signer) {
            this.publicKey = await this.signer.getPublicKey()
            await this.encryptionService.deriveEncryptionKeyFromSigner(this.signer)
        }
        
        this.initialized = true
    }

    setLogger(loger: LoggerFn) {
        setLogger(loger)
        return this
    }

    /**
     * Clears the cache of utxos.
     * 
     * By default, downloaded utxos will be cached in the local storage. Thus the next time when you makes another
     * deposit or withdraw or getPrivateBalance, the SDK only fetches the utxos that are not in the cache.
     * 
     * This method clears the cache of utxos.
     */
    async clearCache() {
        if (!this.publicKey) {
            return this
        }
        storage.removeItem(LSK_FETCH_OFFSET + localstorageKey(this.publicKey))
        storage.removeItem(LSK_ENCRYPTED_OUTPUTS + localstorageKey(this.publicKey))
        return this
    }

    /**
     * Deposit SOL to the Privacy Cash.
     * 
     * Lamports is the amount of SOL in lamports. e.g. if you want to deposit 0.01 SOL (10000000 lamports), call deposit({ lamports: 10000000 })
     */
    async deposit({ lamports }: {
        lamports: number
    }) {
        // Ensure initialized when using signer
        if (this.signer && !this.initialized) {
            await this.initialize()
        }
        
        this.isRuning = true
        logger.info('start depositting')
        let lightWasm = await WasmFactory.getInstance()
        let res = await deposit({
            lightWasm,
            amount_in_lamports: lamports,
            connection: this.connection,
            encryptionService: this.encryptionService,
            publicKey: this.publicKey,
            transactionSigner: async (tx: VersionedTransaction) => {
                if (this.signer) {
                    return await this.signer.signTransaction(tx)
                } else if (this.keypair) {
                    tx.sign([this.keypair])
                    return tx
                } else {
                    throw new Error('No signer or keypair available')
                }
            },
            keyBasePath: path.join(import.meta.dirname, '..', 'circuit2', 'transaction2'),
            storage
        })
        this.isRuning = false
        return res
    }

    /**
     * Withdraw SOL from the Privacy Cash.
     * 
     * Lamports is the amount of SOL in lamports. e.g. if you want to withdraw 0.01 SOL (10000000 lamports), call withdraw({ lamports: 10000000 })
     */
    async withdraw({ lamports, recipientAddress }: {
        lamports: number,
        recipientAddress?: string
    }) {
        // Ensure initialized when using signer
        if (this.signer && !this.initialized) {
            await this.initialize()
        }
        
        this.isRuning = true
        logger.info('start withdrawing')
        let lightWasm = await WasmFactory.getInstance()
        let recipient = recipientAddress ? new PublicKey(recipientAddress) : this.publicKey
        let res = await withdraw({
            lightWasm,
            amount_in_lamports: lamports,
            connection: this.connection,
            encryptionService: this.encryptionService,
            publicKey: this.publicKey,
            recipient,
            keyBasePath: path.join(import.meta.dirname, '..', 'circuit2', 'transaction2'),
            storage
        })
        console.log(`Withdraw successful. Recipient ${recipient} received ${res.amount_in_lamports / LAMPORTS_PER_SOL} SOL, with ${res.fee_in_lamports / LAMPORTS_PER_SOL} SOL relayers fees`)
        this.isRuning = false
        return res
    }

    /**
     * Returns the amount of lamports current wallet has in Privacy Cash.
     */
    async getPrivateBalance() {
        // Ensure initialized when using signer
        if (this.signer && !this.initialized) {
            await this.initialize()
        }
        
        logger.info('getting private balance')
        this.isRuning = true
        let utxos = await getUtxos({ publicKey: this.publicKey, connection: this.connection, encryptionService: this.encryptionService, storage })
        this.isRuning = false
        return getBalanceFromUtxos(utxos)
    }

    /**
     * Returns true if the code is running in a browser.
     */
    isBrowser() {
        return typeof window !== "undefined"
    }

    async startStatusRender() {
        let frames = ['-', '\\', '|', '/'];
        let i = 0
        while (true) {
            if (this.isRuning) {
                let k = i % frames.length
                i++
                stdWrite(this.status, frames[k])
            }
            await new Promise(r => setTimeout(r, 250));
        }
    }
}

function getSolanaKeypair(
    secret: string | number[] | Uint8Array | Keypair
): Keypair | null {
    try {
        if (secret instanceof Keypair) {
            return secret;
        }

        let keyArray: Uint8Array;

        if (typeof secret === "string") {
            keyArray = bs58.decode(secret);
        } else if (secret instanceof Uint8Array) {
            keyArray = secret;
        } else {
            // number[]
            keyArray = Uint8Array.from(secret);
        }

        if (keyArray.length !== 32 && keyArray.length !== 64) {
            return null;
        }
        return Keypair.fromSecretKey(keyArray);
    } catch {
        return null;
    }
}

function stdWrite(status: string, frame: string) {
    let blue = "\x1b[34m";
    let reset = "\x1b[0m";
    process.stdout.write(`${frame}status: ${blue}${status}${reset}\r`);
}