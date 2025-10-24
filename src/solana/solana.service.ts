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
} from '@solana/web3.js';
import bs58 from 'bs58';

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

        let confirmation = await this.connection.confirmTransaction(signature);
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

}