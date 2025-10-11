import {
  Controller,
  Get,
  Param,
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
      );

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
}
