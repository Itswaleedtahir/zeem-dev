import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Delete,
  UseInterceptors,
  UploadedFile,
  Post,
  NotFoundException,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { UpdateProfileDto } from './users.dto';
import { Request,Response } from 'express';
import { JwtPayload } from '../middleware/jwt-payload.interface';
import { UserRole } from '../schemas/user.schema';
import { AccountDetail } from '../schemas/accountDetail.schema';
import { Types } from 'mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  FundManagerGuard,
  InvestorGuard,
  SuperAdminGuard,
} from 'src/middleware/custom.guard';

// @UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('fund-managers')
  getAllFundManagers(
    @Req() req: Request,
    @Query('userId') addedBy?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isAccepted') isAccepted?: string
  ) {
    const user = req.user as JwtPayload;
    let isAcceptedBool: boolean | undefined = undefined;
    if (isAccepted === 'true') {
      isAcceptedBool = true;
    } else if (isAccepted === 'false') {
      isAcceptedBool = false;
    }
    return this.usersService.getAllFundManagers(
      addedBy || user.userId,
      page,
      limit,
      isAcceptedBool
    );
  }

  @UseGuards(JwtAuthGuard, FundManagerGuard)
  @Get('investors')
  getAllInvestors(
    @Req() req: Request,
    @Query('userId') addedBy?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isAccepted') isAccepted?: string
  ) {
    const user = req.user as JwtPayload;

    let isAcceptedBool: boolean | undefined = undefined;
    if (isAccepted === 'true') {
      isAcceptedBool = true;
    } else if (isAccepted === 'false') {
      isAcceptedBool = false;
    }
    return this.usersService.getAllInvestors(
      addedBy || user.userId,
      page,
      limit,
      isAcceptedBool
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile/:id?')
  updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req: Request
  ) {
    if (id && !Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${id} is not a valid ObjectId`);
    }
    const userId = id || (req.user as JwtPayload).userId;
    if (updateProfileDto.password) {
      delete updateProfileDto.password;
    }
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string // Add a new parameter to specify the image type
  ) {
    try {
      if ((req.user as JwtPayload).role === UserRole.FUND_MANAGER) {
        if (!['profile', 'logo'].includes(type)) {
          throw new BadRequestException(
            'Invalid image type. Must be either "profile" or "logo".'
          );
        }
      } else {
        type = 'profile'; // Default to profile image type for non-fund manager users
      }
      return this.usersService.uploadPhoto(
        (req.user as JwtPayload).userId,
        file,
        type
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  // Delete a user photo
  @Delete('delete-photo')
  async deletePhoto(
    @Req() req: Request,
    @Query('type') type: 'profile' | 'logo'
  ) {
    if ((req.user as JwtPayload).role === UserRole.FUND_MANAGER) {
      if (!['profile', 'logo'].includes(type)) {
        throw new BadRequestException(
          'Invalid image type. Must be either "profile" or "logo".'
        );
      }
    } else {
      type = 'profile'; // Default to profile image type for non-fund manager users
    }
    return this.usersService.deletePhoto((req.user as JwtPayload).userId, type);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Put(':id/accept')
  acceptFundManager(@Param('id') id: string, @Req() req: Request) {
    const addedBy = new Types.ObjectId((req.user as JwtPayload).userId);
    return this.usersService.acceptFundManagerRequest(id, addedBy);
  }

  @UseGuards(JwtAuthGuard)
  @Get('account-detail')
  async getUserWithAccountDetail(@Req() req: Request) {
    const user = req.user as JwtPayload;
    const investorId = user.userId;

    if (!Types.ObjectId.isValid(investorId)) {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      return this.usersService.getUserWithAccountDetail(investorId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('User or Account Detail not found');
      }
      throw error;
    }
  }


  @UseGuards(JwtAuthGuard, InvestorGuard)
  @UseGuards(InvestorGuard)
  @Post('account-detail')
  async createOrUpdateAccountDetail(
    @Req() req: Request,
    @Body() accountDetailData: Partial<AccountDetail>
  ) {
    if (!accountDetailData.accountType) {
      throw new BadRequestException('Account type is required');
    }
    const user = req.user as JwtPayload;
    const investorId = user.userId;

    if (!Types.ObjectId.isValid(investorId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.usersService.createOrUpdateAccountDetail(
      investorId,
      accountDetailData
    );
  }


  @UseGuards(JwtAuthGuard)
  @Post('create-stripe-connect-account')
  createStripeConnectAccount(@Req() req: Request) {
    const userId = new Types.ObjectId((req.user as JwtPayload).userId);
    return this.usersService.createStripeConnectAccount(userId);
  }

  @Get('verifyAccount/:connectAccountId')
  async verifyConnectedAccount(@Param('connectAccountId') connectAccountId: string, @Res() res: Response) {
    try {
      const response = await this.usersService.verifyConnectedAccount(connectAccountId);
      
      if (response) {
        console.log("response ",response)
        console.log("we are now redirecting")
        return res.redirect('https://app.harvestfundmanagement.com');
      } else {
        return res.status(HttpStatus.BAD_REQUEST).send('No account detail found.');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('User or Account Detail not found');
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-connected-account-details')
  getConnectedAccountDetails(@Req() req: Request, @Body('connectAccountID') connectAccountID: string) {
    return this.usersService.getConnectedAccountDetails(connectAccountID);
  }

  

}
