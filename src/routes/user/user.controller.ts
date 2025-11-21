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
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './user.service';
import { NotificationService } from 'src/notification/notification.service';
import { ExpoPushMessage } from 'expo-server-sdk';
import { FirebaseAdminService } from 'src/auth/firebase-admin.service';
import { JwtAuthService } from 'src/auth/jwt-auth.service';
import { JwtAccessGuard } from 'src/auth/guards/jwt-access.guard';
import type { AuthenticatedRequest } from 'src/auth/guards/jwt-access.guard';

@Controller('user')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly jwtAuthService: JwtAuthService,
  ) {}

  @Get('protected/test')
  @UseGuards(JwtAccessGuard)
  async protectedPing(@Req() req: AuthenticatedRequest) {
    const payload = req.user;

    if (!payload) {
      throw new HttpException(
        { success: false, message: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.usersService.getUserById(payload.sub);

    return {
      success: true,
      message: 'Authenticated request successful',
      data: {
        tokenPayload: payload,
        user,
      },
    };
  }

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

  @Get('cron-id/:cronId')
  async getUserByCronId(@Param('cronId') cronId: string) {
    try {
      const user = await this.usersService.getUserByCronID(cronId);

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
  async createUser(@Body() body: { phoneNumber: string, idToken: string }) {
    try {
      const { phoneNumber, idToken } = body;

      if (!phoneNumber) {
        throw new HttpException(
          {
            success: false,
            message: 'phoneNumber is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if(!idToken){
        throw new HttpException(
          {
            success: false,
            message: 'idToken is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      try {
        await this.firebaseAdminService.verifyIdToken(idToken);
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid idToken',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.usersService.createUser(phoneNumber);

      if (!result.user) {
        throw new HttpException(
          {
            success: false,
            message: 'Unable to create user record',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const tokens = await this.jwtAuthService.generateTokenPair({
        userId: result.user.user_id,
        phoneNumber: result.user.phone_number,
        cronId: result.user.cron_id,
      });

      return {
        success: true,
        message: result.message,
        data: {
          user: result.user,
          isNewUser: result.isNewUser,
          tokens,
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

  @Post('refresh-token')
  async refreshToken(@Body() body: { refreshToken: string }) {
    try {
      const { refreshToken } = body;

      if (!refreshToken) {
        throw new HttpException(
          {
            success: false,
            message: 'refreshToken is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const payload = await this.jwtAuthService.verifyRefreshToken(refreshToken);
      const user = await this.usersService.getUserById(payload.sub);

      if (!user) {
        throw new HttpException(
          {
            success: false,
            message: 'User associated with token was not found',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const tokens = await this.jwtAuthService.rotateTokens(refreshToken, {
        userId: user.user_id,
        phoneNumber: user.phone_number,
        cronId: user.cron_id,
      });

      return {
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          user,
          tokens,
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
  async transferSpl(
    @Body()
    body: {
      encodedTransaction: string;
      senderAddr: string;
      receiverAddr: string;
      amount: number;
      token: Array<{ amount: string; token_address: string }>;
    },
  ) {
    try {
      const { encodedTransaction, senderAddr, receiverAddr, amount, token } =
        body;

      if (
        !encodedTransaction ||
        !senderAddr ||
        !receiverAddr ||
        !amount ||
        !token
      ) {
        throw new HttpException(
          {
            success: false,
            message:
              'encodedTransaction, senderAddr, receiverAddr, amount, and token are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.usersService.transferSpl(
        encodedTransaction,
        senderAddr,
        receiverAddr,
        amount,
        token,
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

      try {
        const receiver = await this.usersService.getUserByAddress(receiverAddr);

        if (!receiver) {
          this.logger.warn(
            `Skipping push notification: receiver ${receiverAddr} not found`,
          );
        } else if (!receiver.expo_push_token) {
          this.logger.debug(
            `Skipping push notification: receiver ${receiverAddr} missing expo token`,
          );
        } else {
          const notification: ExpoPushMessage = {
            to: receiver.expo_push_token,
            sound: 'default',
            body: `You received ${amount}`,
          };

          const tickets = await NotificationService.pushNotify([notification]);
          const failedTickets = tickets.filter(
            (ticket) => ticket.status !== 'ok',
          );

          if (failedTickets.length) {
            const reasons = failedTickets
              .map(
                (ticket) =>
                  ticket.message ??
                  (ticket.details && 'error' in ticket.details
                    ? String(ticket.details.error)
                    : 'Unknown error'),
              )
              .join('; ');

            this.logger.warn(
              `Expo push notification reported errors for receiver ${receiverAddr}: ${reasons}`,
            );
          }
        }
      } catch (notificationError) {
        this.logger.error(
          `Failed to process push notification for receiver ${receiverAddr}`,
          notificationError instanceof Error ? notificationError.stack : undefined,
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

  @Get('debug/:level')
  async debug(@Param('level') level: string) {
    console.log("DEBUG LEVEL: ", level);
    return {
      success: true,
      message: 'Debug completed successfully',
      data: {
        message: 'Debug completed successfully',
      },
    };
  }
}
