/**
 * Keeper Diagnostic Check Script
 * 
 * PURPOSE: Verify the NestJS Backend is fully capable of acting as the Keeper
 * 
 * RUN: npx ts-node src/scripts/diagnostic-check.ts
 * 
 * CHECKS:
 * 1. Identity Verification - KEEPER_PRIVATE_KEY loads correctly
 * 2. IDL Integrity - weswap.json has OrderDirection field
 * 3. On-Chain Connection - Can fetch strategies from RPC
 * 4. Data Parsing - Can deserialize strategy with new enums
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import * as bs58 from 'bs58';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Console colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const log = {
    success: (msg: string) => console.log(`${GREEN}✅ ${msg}${RESET}`),
    error: (msg: string) => console.log(`${RED}❌ ${msg}${RESET}`),
    warn: (msg: string) => console.log(`${YELLOW}⚠️  ${msg}${RESET}`),
    info: (msg: string) => console.log(`${CYAN}ℹ️  ${msg}${RESET}`),
    header: (msg: string) => console.log(`\n${CYAN}═══════════════════════════════════════${RESET}\n${CYAN}  ${msg}${RESET}\n${CYAN}═══════════════════════════════════════${RESET}\n`),
};

async function runDiagnostics() {
    console.log('\n');
    log.header('🔍 KEEPER DIAGNOSTIC CHECK');
    console.log('  Running 4 system checks...\n');

    let allPassed = true;

    // ============================================================
    // CHECK 1: IDENTITY VERIFICATION
    // ============================================================
    console.log('📋 CHECK 1: Identity Verification');
    console.log('─'.repeat(40));

    const keeperPrivateKey = process.env.KEEPER_PRIVATE_KEY;

    if (!keeperPrivateKey) {
        log.error('KEEPER_PRIVATE_KEY not found in .env');
        log.info('Add: KEEPER_PRIVATE_KEY=<base58-encoded-private-key>');
        allPassed = false;
    } else {
        try {
            const secretKey = bs58.decode(keeperPrivateKey);
            const keeperKeypair = Keypair.fromSecretKey(secretKey);
            log.success(`Keeper Wallet Loaded: ${keeperKeypair.publicKey.toString()}`);

            // Check balance
            const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
            const connection = new Connection(rpcUrl, 'confirmed');
            const balance = await connection.getBalance(keeperKeypair.publicKey);
            const balanceSOL = balance / 1e9;

            if (balanceSOL < 0.01) {
                log.warn(`Low Balance for Gas: ${balanceSOL.toFixed(4)} SOL`);
                log.info('Recommended: At least 0.1 SOL for reliable execution');
            } else {
                log.success(`Balance: ${balanceSOL.toFixed(4)} SOL`);
            }
        } catch (error: any) {
            log.error(`Invalid KEEPER_PRIVATE_KEY format: ${error.message}`);
            allPassed = false;
        }
    }

    console.log('');

    // ... inside the main function ...

    console.log("\n📋 CHECK 2: IDL Integrity (DEBUG MODE)");
    console.log("────────────────────────────────────────");
    const idlPath = path.resolve(__dirname, '../blockchain/idl/weswap.json');
    console.log(`🔍 Reading from: ${idlPath}`);

    if (!fs.existsSync(idlPath)) {
        console.log("❌ CRITICAL: File does not exist at path!");
        return;
    }

    const idlRaw = fs.readFileSync(idlPath, 'utf-8');
    const idl = JSON.parse(idlRaw);

    // 1. Check for the Enum
    const hasDirectionEnum = idl.types?.find((t: any) => t.name === 'OrderDirection');
    console.log(hasDirectionEnum ? "✅ Enum 'OrderDirection': FOUND" : "❌ Enum 'OrderDirection': MISSING");

    // 2. Check the Strategy Account
    const strategyAccount = idl.accounts?.find((a: any) => a.name === 'Strategy');
    if (!strategyAccount) {
        console.log("❌ Account 'Strategy': MISSING in IDL");
    } else {
        console.log("✅ Account 'Strategy': FOUND");
        console.log("   Dumping ALL fields found in Strategy:");
        // Print every single field name found in the file
        strategyAccount.type.fields.forEach((f: any) => {
            console.log(`   - ${f.name} (${f.type?.defined || f.type})`);
        });

        const hasDirectionField = strategyAccount.type.fields.find((f: any) => f.name === 'direction');
        if (hasDirectionField) {
            console.log("\n✅ RESULT: 'direction' field is PRESEN T.");
        } else {
            console.log("\n❌ RESULT: 'direction' field is MISSING.");
            console.log("   (Compare the list above. Did you name it 'orderDirection' or something else?)");
        }
    }

    // ============================================================
    // CHECK 3: ON-CHAIN CONNECTION
    // ============================================================
    console.log('📋 CHECK 3: On-Chain Connection');
    console.log('─'.repeat(40));

    const rpcUrl = process.env.SOLANA_RPC_URL;
    const programId = process.env.PROGRAM_ID;

    if (!rpcUrl) {
        log.error('SOLANA_RPC_URL not set in .env');
        allPassed = false;
    } else if (!programId) {
        log.error('PROGRAM_ID not set in .env');
        allPassed = false;
    } else {
        try {
            const connection = new Connection(rpcUrl, 'confirmed');
            log.success(`RPC Connected: ${rpcUrl.substring(0, 50)}...`);

            // Load IDL for program initialization
            const idlContent = fs.readFileSync(idlPath, 'utf-8');
            const idl = JSON.parse(idlContent);

            // Create dummy wallet for read-only operations
            const dummyKeypair = Keypair.generate();
            const wallet = new anchor.Wallet(dummyKeypair);
            const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
            anchor.setProvider(provider);

            const program = new Program(idl as any, provider);
            log.success(`Program initialized: ${program.programId.toString()}`);

            // Fetch all strategies (cast to any for dynamic IDL)
            const strategies = await (program.account as any).strategy.all();
            log.success(`Connection Established. Found ${strategies.length} Strategies on-chain.`);

            // ============================================================
            // CHECK 4: DATA PARSING (The Crash Test)
            // ============================================================
            console.log('');
            console.log('📋 CHECK 4: Data Parsing (Crash Test)');
            console.log('─'.repeat(40));

            if (strategies.length === 0) {
                log.warn('No strategies found on-chain to test parsing');
                log.info('Create a test strategy to verify full deserialization');
            } else {
                const firstStrategy = strategies[0];
                const account = firstStrategy.account as any;

                try {
                    // Try to access the direction field (this will crash if IDL is wrong)
                    const direction = account.direction;
                    const status = account.status;

                    if (direction !== undefined) {
                        let directionStr = 'Unknown';
                        if ('buy' in direction) directionStr = '{ buy: {} }';
                        else if ('sell' in direction) directionStr = '{ sell: {} }';
                        else if (typeof direction === 'object') directionStr = JSON.stringify(direction);

                        log.success(`First Strategy Direction: ${directionStr}`);
                    } else {
                        log.warn('Direction field is undefined (may be using legacy format)');
                    }

                    if (status !== undefined) {
                        let statusStr = 'Unknown';
                        if ('active' in status) statusStr = 'Active';
                        else if ('filled' in status) statusStr = 'Filled';
                        else if ('closed' in status) statusStr = 'Closed';
                        else if ('cancelled' in status) statusStr = 'Cancelled';
                        else if (typeof status === 'object') statusStr = JSON.stringify(status);

                        log.success(`First Strategy Status: ${statusStr}`);
                    }

                    log.success('Data deserialization PASSED - No crash!');

                    // Print summary
                    console.log('');
                    console.log('📊 Strategy Sample:');
                    console.log(`   PDA: ${firstStrategy.publicKey.toString()}`);
                    console.log(`   Owner: ${account.owner?.toString()?.substring(0, 20)}...`);
                    console.log(`   Sell Token: ${account.sellTokenMint?.toString()?.substring(0, 20)}...`);
                    console.log(`   Buy Token: ${account.buyTokenMint?.toString()?.substring(0, 20)}...`);
                    console.log(`   Trigger Price: ${account.triggerPrice?.toString()}`);

                } catch (parseError: any) {
                    log.error(`Data parsing FAILED: ${parseError.message}`);
                    log.info('This usually means the IDL does not match the on-chain account structure');
                    allPassed = false;
                }
            }

        } catch (error: any) {
            log.error(`Connection failed: ${error.message}`);
            allPassed = false;
        }
    }

    // ============================================================
    // FINAL VERDICT
    // ============================================================
    console.log('');
    log.header('📊 DIAGNOSTIC RESULTS');

    if (allPassed) {
        log.success('ALL CHECKS PASSED! The Keeper is ready for production.');
        console.log('');
        console.log('  Next steps:');
        console.log('  1. Deploy to Railway');
        console.log('  2. Set KEEPER_PRIVATE_KEY in Railway variables');
        console.log('  3. Check logs for "🤖 Keeper loop started"');
        console.log('');
    } else {
        log.error('SOME CHECKS FAILED! Fix issues before deploying.');
        console.log('');
        console.log('  Quick fixes:');
        console.log('  1. anchor build (in program/ folder)');
        console.log('  2. cp target/idl/weswap.json "../OrderSwap Backend/src/blockchain/idl/"');
        console.log('  3. Set KEEPER_PRIVATE_KEY in .env');
        console.log('');
    }
}

// Run diagnostics
runDiagnostics().catch(console.error);
