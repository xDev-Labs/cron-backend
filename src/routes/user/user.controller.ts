import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './user.service';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
