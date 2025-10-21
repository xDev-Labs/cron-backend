import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get(':hash')
  async getTransactionByHash(@Param('hash') hash: string) {
    try {
      const transaction =
        await this.transactionService.getTransactionByHash(hash);
      if (!transaction) {
        throw new HttpException(
          {
            success: false,
            message: 'Transaction not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        message: 'Transaction retrieved successfully',
        data: transaction,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  async getTransactionsByUserId(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('receiver') receiver?: string,
  ) {
    try {
      // Parse and validate pagination parameters
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;

      // Validate pagination parameters
      if (pageNum < 1) {
        throw new HttpException(
          {
            success: false,
            message: 'Page number must be greater than 0',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (limitNum < 1 || limitNum > 100) {
        throw new HttpException(
          {
            success: false,
            message: 'Limit must be between 1 and 100',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.transactionService.getTransactionsByUserId(
        userId,
        pageNum,
        limitNum,
        receiver,
      );
      // console.log(result.transactions);
      return {
        success: true,
        message: 'User transactions retrieved successfully',
        data: {
          userId,
          transactions: result.transactions,
          pagination: result.pagination,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createTransaction(
    @Body()
    body: {
      transaction_hash: string;
      sender_uid: string;
      receiver_uid: string;
      amount: number;
      token: Array<{ amount: string; token_address: string }>;
      chain_id: number;
      status?: 'pending' | 'completed' | 'failed';
    },
  ) {
    try {
      const {
        transaction_hash,
        sender_uid,
        receiver_uid,
        amount,
        token,
        chain_id,
        status,
      } = body;

      // Validate required fields
      if (
        !transaction_hash ||
        !sender_uid ||
        !receiver_uid ||
        !amount ||
        !token ||
        !chain_id
      ) {
        throw new HttpException(
          {
            success: false,
            message:
              'transaction_hash, sender_uid, receiver_uid, amount, token, and chain_id are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate token array
      if (!Array.isArray(token) || token.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'token must be a non-empty array',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate each token object
      for (const t of token) {
        if (!t.amount || !t.token_address) {
          throw new HttpException(
            {
              success: false,
              message: 'Each token must have amount and token_address',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const result = await this.transactionService.createTransaction({
        transaction_hash,
        sender_uid,
        receiver_uid,
        amount,
        token,
        chain_id,
        status,
      });

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            message: result.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        message: result.message,
        data: result.transaction,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
