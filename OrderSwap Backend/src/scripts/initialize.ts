import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import { createHash } from "crypto";

dotenv.config();

async function main() {
    console.log("🚀 Starting Initialization (Manual Payload Mode)...");

    // 1. Setup Connection
    const rpcUrl = process.env.SOLANA_RPC_URL;
    if (!rpcUrl) {
        throw new Error("Missing SOLANA_RPC_URL environment variable");
    }
    const connection = new Connection(rpcUrl, "confirmed");

    // 2. Setup Wallet
    const privateKey = process.env.KEEPER_PRIVATE_KEY;
    if (!privateKey) throw new Error("Missing KEEPER_PRIVATE_KEY");

    let keypair: Keypair;
    if (privateKey.includes("[")) {
        keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(privateKey)));
    } else {
        keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    }

    // 3. Define Constants
    const programId = new PublicKey("7UiSkmJek7KrNyUFLBi4vphdimZuYh2iGRNpAfzwKR8r");
    const TREASURY_WALLET = keypair.publicKey; // Using admin as treasury for now

    // 4. Calculate PDA
    const [globalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global")],
        programId
    );
    console.log("📍 Global PDA:", globalPda.toBase58());

    // 5. Construct the Data Buffer Manually (Bypassing Anchor serialization)
    // Structure: [Discriminator (8)] + [Fee (2)] + [MaxStrat (8)] + [KeepersLen (4)] + [KeeperPubkey (32)]

    const bufferSize = 8 + 2 + 8 + 4 + 32;
    const data = Buffer.alloc(bufferSize);
    let offset = 0;

    // A. Discriminator ("global:initialize")
    const preimage = "global:initialize";
    const hash = createHash("sha256").update(preimage).digest();
    const discriminator = hash.subarray(0, 8);
    discriminator.copy(data, offset);
    offset += 8;

    // B. platform_fee_bps (u16) -> Set to 50 (0.5%)
    data.writeUInt16LE(50, offset);
    offset += 2;

    // C. max_strategies_per_user (u64) -> Set to 100
    // We use BigInt64 for u64
    data.writeBigUInt64LE(BigInt(100), offset);
    offset += 8;

    // D. keepers (Vec<Pubkey>)
    // Length of vector (u32) -> 1 Keeper
    data.writeUInt32LE(1, offset);
    offset += 4;

    // Keeper Public Key (32 bytes) -> Using our wallet as the keeper
    keypair.publicKey.toBuffer().copy(data, offset);
    offset += 32;

    console.log("📦 Data Packet Size:", data.length, "bytes");

    // 6. Build Instruction
    const instruction = new TransactionInstruction({
        programId: programId,
        data: data,
        keys: [
            // 1. authority (Signer)
            { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
            // 2. global (PDA, Writable)
            { pubkey: globalPda, isSigner: false, isWritable: true },
            // 3. treasury (Unchecked) <--- THIS WAS MISSING
            { pubkey: TREASURY_WALLET, isSigner: false, isWritable: false },
            // 4. system_program
            { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // SystemProgram ID is 1111.. which is default in some contexts, but let's be explicit below:
        ]
    });

    // Fix SystemProgram ID manually to be safe
    instruction.keys[3].pubkey = new PublicKey("11111111111111111111111111111111");

    // 7. Send Transaction
    try {
        console.log("📤 Sending Transaction...");
        const transaction = new Transaction().add(instruction);

        const txSig = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keypair]
        );

        console.log("✅ Success! Protocol Initialized.");
        console.log("📝 Tx Signature:", txSig);

    } catch (error: any) {
        console.error("❌ Failed:", error);
        if (JSON.stringify(error).includes("already in use") || error.logs?.some((l: string) => l.includes("already in use"))) {
            console.log("⚠️  Note: Account ALREADY exists. You are good to go!");
        }
    }
}

main();