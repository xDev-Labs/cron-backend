import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './user.service';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    try {
      const user = await this.usersService.getUserById(id);
      if (!user) {
        throw new HttpException(
          {
            success: false,
            message: 'User not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        message: 'User retrieved successfully',
        data: user,
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

  @Get('phone/:phoneNumber')
  async getUserByPhoneNumber(@Param('phoneNumber') phoneNumber: string) {
    try {
      const user = await this.usersService.getUserByPhoneNumber(phoneNumber);

      if (!user) {
        throw new HttpException(
          {
            success: false,
            message: 'User not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: 'User retrieved successfully',
        data: user,
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

  @Get('address/:address')
  async getUserByAddress(@Param('address') address: string) {
    try {
      const user = await this.usersService.getUserByAddress(address);

      if (!user) {
        throw new HttpException(
          {
            success: false,
            message: 'User not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: 'User retrieved successfully',
        data: user,
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

  // Route 1: Check if cron ID is available
  @Get('cron-id/check/:cronId')
  async checkCronIdAvailability(@Param('cronId') cronId: string) {
    try {
      const result = await this.usersService.checkCronIdAvailability(cronId);
      return {
        success: true,
        message: result.message,
        data: {
          cronId,
          available: result.available,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Route 2: Register cron ID for a user
  @Post('cron-id/register')
  async registerCronId(@Body() body: { userId: string; cronId: string }) {
    try {
      const { userId, cronId } = body;

      if (!userId || !cronId) {
        throw new HttpException(
          {
            success: false,
            message: 'userId and cronId are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.usersService.registerCronId(userId, cronId);

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
        data: result.user,
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

  // Route 3: Create or find user by phone number
  @Post('create')
  async createUser(@Body() body: { phoneNumber: string }) {
    try {
      const { phoneNumber } = body;

      if (!phoneNumber) {
        throw new HttpException(
          {
            success: false,
            message: 'phoneNumber is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.usersService.createUser(phoneNumber);

      return {
        success: true,
        message: result.message,
        data: {
          user: result.user,
          isNewUser: result.isNewUser,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Route 4: Update user during onboarding
  @Put(':id')
  async updateUser(@Param('id') userId: string, @Body() updateData: any) {
    try {
      if (!userId) {
        throw new HttpException(
          {
            success: false,
            message: 'User ID is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.usersService.updateUser(userId, updateData);

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
        data: result.user,
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

  // Route 5: Onboard user with wallet, username, avatar, and transaction
  @Post('onboard')
  async onboardUser(
    @Body()
    body: {
      userId: string;
      walletAddress: string;
      smartWalletAddress: string;
      encodedTransaction: string;
    },
  ) {
    try {
      const { userId, walletAddress, smartWalletAddress, encodedTransaction } =
        body;

      // Validate required parameters
      if (
        !userId ||
        !walletAddress ||
        !smartWalletAddress ||
        !encodedTransaction
      ) {
        throw new HttpException(
          {
            success: false,
            message:
              'All parameters are required: userId, walletAddress, encodedTransaction',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.usersService.onboardUser(
        userId,
        walletAddress,
        smartWalletAddress,
        encodedTransaction,
      );

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
        data: {
          user: result.user,
          signature: result.signature,
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

  // Route 6: Update user avatar
  @Put(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateAvatar(
    @Param('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!userId) {
        throw new HttpException(
          {
            success: false,
            message: 'User ID is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!file) {
        throw new HttpException(
          {
            success: false,
            message: 'Avatar file is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (file.size === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'Uploaded file is empty (0 bytes)',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.usersService.updateAvatar(
        userId,
        file.buffer,
        file.originalname,
      );

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
        data: {
          user: result.user,
          avatarUrl: result.avatarUrl,
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

  // Route 7: Transfer SPL token
  @Post('transfer-spl')
  async transferSpl(@Body() body: { encodedTransaction: string, senderUid: string, receiverUid: string, amount: number, token: Array<{ amount: string; token_address: string }> }) {
    try {
      const { encodedTransaction, senderUid, receiverUid, amount, token } = body;

      if (!encodedTransaction || !senderUid || !receiverUid || !amount || !token) {
        throw new HttpException(
          {
            success: false,
            message: 'encodedTransaction, senderUid, receiverUid, amount, and token are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.usersService.transferSpl(encodedTransaction, senderUid, receiverUid, amount, token);

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
        data: {
          signature: result.signature,
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


  // Route 8: Get tokens by user ID
  @Get(':id/tokens')
  async getTokensByUserId(@Param('id') userId: string) {
    try {
      const tokens = await this.usersService.getTokensByUserId(userId);
      return {
        success: true,
        message: 'Tokens retrieved successfully',
        data: tokens,
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

  // Route 9: Airdrop SPL token
  @Post('airdrop')
  async airdropSplToken(@Body() body: { userId: string; amount: number }) {
    try {
      const { userId, amount } = body;

      if (!userId || !amount) {
        throw new HttpException(
          {
            success: false,
            message: 'userId and amount are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (amount <= 0) {
        throw new HttpException(
          {
            success: false,
            message: 'Amount must be greater than 0',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const signature = await this.usersService.airdropSplToken(userId, amount);

      return {
        success: true,
        message: 'SPL token airdrop completed successfully',
        data: {
          signature,
          userId,
          amount,
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
