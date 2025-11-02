import { BadRequestException, Injectable } from '@nestjs/common';
import {
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
  AddressLookupTableAccount,
  TransactionInstruction,
  Connection,
  SendTransactionError,
  Transaction,
  Keypair,
  TransactionConfirmationStatus,
  SignatureStatus,
  RpcResponseAndContext,
  SystemProgram,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, AccountLayout, createTransferCheckedInstruction, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchMetadata, findMetadataPda, mplTokenMetadata, Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { SupabaseService } from 'src/supabase/supabase.service';

export interface Token {
  mintAddr: string;
  balance: number;
  name: string;
  symbol: string;
  decimals: number;
}

export interface DecompiledTransaction {
  accounts: PublicKey[];
  instructions: TransactionInstruction[];
  addressLookupTableAccounts: AddressLookupTableAccount[];
  signatures: Uint8Array<ArrayBufferLike>[];
  originalFeePayer?: PublicKey;
}

export enum Encoding {
  BASE64 = 'base64',
  BASE58 = 'base58',
  HEX = 'hex',
}

@Injectable()
export class SolanaService {
  private connection: Connection;
  private umi: any;

  constructor(
    private readonly supabaseService: SupabaseService,
  ) {
    this.connection = new Connection(process.env.SOLANA_RPC_ENDPOINT!);
    this.umi = createUmi(process.env.SOLANA_RPC_ENDPOINT!).use(mplTokenMetadata());
  }

  decodeTransaction(encodedTransaction: string, encoding: Encoding): Transaction | VersionedTransaction {
    let buffer: Buffer;
    switch (encoding) {
      case Encoding.HEX:
        buffer = Buffer.from(encodedTransaction, 'hex');
        break;
      case Encoding.BASE64:
        buffer = Buffer.from(encodedTransaction, 'base64');
        break;
      case Encoding.BASE58:
        buffer = Buffer.from(bs58.decode(encodedTransaction));
        break;
      default:
        throw new Error('Invalid encoding');
    }

    // Try to deserialize as VersionedTransaction first
    try {
      return VersionedTransaction.deserialize(buffer);
    } catch (error) {
      // If that fails, it's a legacy transaction
      return Transaction.from(buffer);
    }
  }

  async signAndSendTransaction(
    encodedTransaction: string,
    encoding: Encoding,
    feePayer: Keypair
  ): Promise<string> {

    const transaction = this.decodeTransaction(encodedTransaction, encoding);

    if (transaction instanceof Transaction) {

      // Verify fee payer matches
      if (!transaction.feePayer || !transaction.feePayer.equals(feePayer.publicKey)) {
        throw new BadRequestException(
          `Transaction fee payer (${transaction.feePayer?.toBase58()}) does not match server fee payer (${feePayer.publicKey.toBase58()})`
        );
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Sign the transaction
      transaction.sign(feePayer);

      // Send transaction
      try {
        const signature = await this.connection.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          }
        );

        return signature;
      } catch (error) {
        console.error('=== TRANSACTION ERROR ===');
        if (error instanceof SendTransactionError) {
          console.error('Error type: SendTransactionError');
          console.error('Error message:', error.message);
          console.error('Error logs:', error.logs);
        } else {
          console.error('Error type:', error.constructor.name);
          console.error('Error details:', error);
        }
        throw error;
      }

    } else {
      // Versioned transaction

      // For versioned transactions, we need to check if fee payer matches
      const feePayer0 = transaction.message.staticAccountKeys[0];
      if (!feePayer0.equals(feePayer.publicKey)) {
        throw new BadRequestException(
          `Transaction fee payer (${feePayer0.toBase58()}) does not match server fee payer (${feePayer.publicKey.toBase58()})`
        );
      }

      // Clone the transaction and sign it directly without recompiling
      // This preserves the account order and prevents signature invalidation

      try {
        transaction.sign([feePayer]);
        // Send transaction
        const signature = await this.connection.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          }
        );

        return signature;

      } catch (error) {
        console.error('=== TRANSACTION ERROR ===');
        if (error instanceof SendTransactionError) {
          console.error('Error type: SendTransactionError');
          console.error('Error message:', error.message);
          console.error('Error logs:', error.logs);
        } else {
          console.error('Error type:', error.constructor.name);
          console.error('Error details:', error);
        }
        throw error;
      }
    }
  }

  async getTxnStatus(signature: string): Promise<RpcResponseAndContext<SignatureStatus | null>> {
    return await this.connection.getSignatureStatus(signature);
  }

  private async fetchTokenMetadata(mintAddress: string): Promise<{ name: string; symbol: string }> {
    try {
      const mint = publicKey(mintAddress);
      const metadataPda = findMetadataPda(this.umi, { mint });
      const metadata = await fetchMetadata(this.umi, metadataPda);
      return {
        name: metadata.name || 'Unknown',
        symbol: metadata.symbol || 'Unknown'
      };
    } catch (error) {
      // Return default values if metadata fetch fails
      return {
        name: '',
        symbol: ''
      };
    }
  }

  async getTokensByAddress(address: string): Promise<Token[]> {
    let tokens = await this.connection.getTokenAccountsByOwner(new PublicKey(address), { programId: TOKEN_PROGRAM_ID });
    let tokens2022 = await this.connection.getTokenAccountsByOwner(new PublicKey(address), { programId: TOKEN_2022_PROGRAM_ID });

    const allTokens: Token[] = [];

    let solBalance = await this.connection.getBalance(new PublicKey(address));
    allTokens.push({
      mintAddr: '11111111111111111111111111111111',
      balance: solBalance,
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    });

    // Process standard tokens
    for (const token of tokens.value) {
      const accountInfo = AccountLayout.decode(token.account.data);
      const mintAddr = accountInfo.mint.toBase58();
      const metadata = await this.fetchTokenMetadata(mintAddr);

      allTokens.push({
        mintAddr,
        balance: Number(accountInfo.amount),
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: 9,
      });
    }

    // Process Token-2022 tokens
    for (const token of tokens2022.value) {
      const accountInfo = AccountLayout.decode(token.account.data);
      const mintAddr = accountInfo.mint.toBase58();
      const metadata = await this.fetchTokenMetadata(mintAddr);

      allTokens.push({
        mintAddr,
        balance: Number(accountInfo.amount),
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: 9,
      });
    }

    let tokenAddresses = allTokens.map(token => token.mintAddr);
    let tokensMetadata = await this.supabaseService.getTokenByAddresses(tokenAddresses);
    if (tokensMetadata) {
      for (const token of allTokens) {
        let tokenMetadata = tokensMetadata.find(tokenMetadata => tokenMetadata.id === token.mintAddr);
        if (tokenMetadata) {
          token.name = tokenMetadata.name;
          token.symbol = tokenMetadata.symbol;
          token.decimals = tokenMetadata.decimals;
        }
      }
    }

    return allTokens;
  }

  async airdropSplToken(toAddress: string, amount: number): Promise<Transaction> {
    const transaction = new Transaction();

    let srcAccount = new PublicKey("Fp2sPAud8hDdunbFdbXUXDATdkSMcrQEKq7CLJSQs6MV")
    let serverPubkey = new PublicKey("3Exg1bwcYyQP926DF321hoojVqMZNAkNZgfhsNmEyzfC")
    let mint = new PublicKey("DMC3nUVXBLNrB8f97wLqwkNw9DD7EXgqhPgev8gVTv7g")
    let to = new PublicKey(toAddress)

    let dstAccount = getAssociatedTokenAddressSync(
      mint,
      to,
      true,
      TOKEN_PROGRAM_ID,
    );

    let account = await this.connection.getAccountInfo(dstAccount);
    if (!account) {
      const tokenAccountCreationIx = createAssociatedTokenAccountInstruction(
        serverPubkey,
        dstAccount,
        to,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      transaction.add(tokenAccountCreationIx);
    }

    const instruction = createTransferCheckedInstruction(
      srcAccount,
      mint,
      dstAccount,
      serverPubkey,
      amount * 10 ** 8,
      8
    );
    transaction.add(instruction);

    let solTransferIx = SystemProgram.transfer({
      fromPubkey: serverPubkey,
      toPubkey: to,
      lamports: 0.1 * 10 ** 9,
    });
    transaction.add(solTransferIx);

    transaction.feePayer = serverPubkey;
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    return transaction;
  }

}