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
} from '@solana/web3.js';
import bs58 from 'bs58';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, AccountLayout } from '@solana/spl-token';

export interface Token {
  mintAddr: string;
  balance: string;
  name: string;
  symbol: string;
  valueInUsd: number;
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

  constructor() {
    this.connection = new Connection(process.env.SOLANA_RPC_ENDPOINT!);
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

  async getTokensByAddress(address: string): Promise<Token[]> {
    let tokens = await this.connection.getTokenAccountsByOwner(new PublicKey(address), { programId: TOKEN_PROGRAM_ID });
    let tokens2022 = await this.connection.getTokenAccountsByOwner(new PublicKey(address), { programId: TOKEN_2022_PROGRAM_ID });

    const allTokens: Token[] = [];

    // Process standard tokens
    for (const token of tokens.value) {
      const accountInfo = AccountLayout.decode(token.account.data);
      allTokens.push({
        mintAddr: accountInfo.mint.toBase58(),
        balance: accountInfo.amount.toString(),
        name: 'Test',
        symbol: 'TEST',
        valueInUsd: 0,
      });
    }

    // Process Token-2022 tokens
    for (const token of tokens2022.value) {
      const accountInfo = AccountLayout.decode(token.account.data);
      allTokens.push({
        mintAddr: accountInfo.mint.toBase58(),
        balance: accountInfo.amount.toString(),
        name: 'Test 2022',
        symbol: 'TEST2022',
        valueInUsd: 0,
      });
    }

    return allTokens;
  }

}