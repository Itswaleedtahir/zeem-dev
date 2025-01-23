import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRole } from '../schemas/user.schema';
import {
  AccountDetail,
  AccountDetailDocument,
} from '../schemas/accountDetail.schema';
import { UpdateProfileDto } from './users.dto';
import { ConfigService } from '@nestjs/config';
import { deleteFile, dynamicFileUpload } from 'src/utils/upload.utils';
import { sendEmail } from 'src/utils/communication';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { LogActions, LogEntity } from 'src/schemas/activity-log.schema';
import Stripe from 'stripe';
import { Wallet } from 'src/schemas/wallet.schema';
@Injectable()
export class UsersService {
  private stripe: Stripe;
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(AccountDetail.name) private accountDetailModel: Model<AccountDetailDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    private readonly activityLogService: ActivityLogService

  ) {
    // Initialize Stripe
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  async getAllFundManagers(
    addedBy: string,
    page?: number,
    limit?: number,
    isAccepted?: boolean
  ): Promise<{ data: User[]; total: number }> {
    const filter = {
      role: UserRole.FUND_MANAGER,
      // addedBy: new Types.ObjectId(addedBy),
      isDeleted: false,
    };
    if (isAccepted || isAccepted == false) {
      filter['isAccepted'] = isAccepted;
    }
    let query = this.userModel.find(filter);
    if (page && limit) {
      query = query.skip((page - 1) * limit).limit(limit);
    }
    const data = await query.exec();

    const total = await this.userModel.countDocuments(filter).exec();
    return { total, data };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto
  ): Promise<User> {
    if (updateProfileDto.password) {
      throw new ForbiddenException(
        'Password update is not allowed through this API'
      );
    }

    try {
      const user = await this.userModel
        .findByIdAndUpdate(userId, updateProfileDto, { new: true })
        .exec();
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Log the activity
      try {
        await this.activityLogService.logActivity({
          userId: user._id.toString(),
          action: LogActions.UPDATE,
          entity: LogEntity.USER,
          entityId: user._id.toString(),
        });
      } catch { }

      return user;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('User with this email already exists.');
      }
      throw error;
    }
  }
  async findById(userId: string): Promise<User> {
    return await this.userModel.findById(userId).exec();
  }

  async uploadPhoto(
    userId: string,
    file: Express.Multer.File,
    type: string // Initially accept 'type' as a general string
  ): Promise<{ user: User; message: string }> {
    // Ensure 'type' is either 'profile' or 'logo'
    if (type !== 'profile' && type !== 'logo') {
      throw new BadRequestException(
        'Invalid photo type. Must be "profile" or "logo".'
      );
    }

    try {
      // Now 'type' is narrowed to 'profile' | 'logo', so this call is safe
      await this.deletePhoto(userId, type);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // If user or photo is not found, handle this as a non-fatal error
        console.log(
          `No ${type} photo found for the user, proceeding with upload.`
        );
      } else {
        // If there's any other error, rethrow it
        throw error;
      }
    }

    const { filePath, fileUrl, message } = await dynamicFileUpload(file);

    // Update the user's photo information based on the type
    const updateData =
      type === 'profile'
        ? { photoPath: filePath, photoUrl: fileUrl }
        : { logoPath: filePath, logoUrl: fileUrl };

    // Update the user's document in the database
    const user = await this.userModel.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    // Determine the correct log action based on the type
    const logAction =
      type === 'profile'
        ? LogActions.UPDATE_PROFILE_PIC
        : LogActions.UPDATE_LOGO_PIC;

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: user._id.toString(),
        action: logAction, // Use the correct log action
        entity: LogEntity.USER,
        entityId: user._id.toString(),
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }

    return { user, message };
  }

  async deletePhoto(
    userId: string,
    type: 'profile' | 'logo'
  ): Promise<{ user: User; message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let photoPath: string | null = null;
    let logAction: LogActions;

    // Determine the photo path and log action based on the type
    if (type === 'profile') {
      photoPath = user.photoPath;
      logAction = LogActions.DELETE_PROFILE_PIC;
    } else if (type === 'logo') {
      photoPath = user.logoPath;
      logAction = LogActions.DELETE_LOGO_PIC;
    } else {
      throw new BadRequestException('Invalid photo type specified');
    }

    // Check if the photo path exists
    if (!photoPath) {
      throw new NotFoundException(
        `${type.charAt(0).toUpperCase() + type.slice(1)} photo not found`
      );
    }

    // Attempt to delete the file
    const result = await deleteFile(photoPath);

    // Update the user object by setting the appropriate fields to null
    if (type === 'profile') {
      user.photoPath = null;
      user.photoUrl = null;
    } else if (type === 'logo') {
      user.logoPath = null;
      user.logoUrl = null;
    }

    await user.save();

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: user._id.toString(),
        action: logAction,
        entity: LogEntity.USER,
        entityId: user._id.toString(),
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }

    return { user, message: result };
  }

  async acceptFundManagerRequest(id: string, addedBy: Types.ObjectId) {
    const fundManager = await this.userModel.findByIdAndUpdate(
      id,
      { isAccepted: true, addedBy },
      { new: true } // Return the updated document
    );
    if (!fundManager) {
      throw new NotFoundException('Fund Manager not found.');
    }
    const emailContent = `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2>Account Verified 🎉</h2>
    <p>Dear ${fundManager.name},</p>
    <p>We are pleased to inform you that your account has been successfully verified. You can now log in to your account using the link below:</p>
    <p>
      <a href="https://harvestfundmanagement.com/auth/signin" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Sign In Now
      </a>
    </p>
    <p>If the button above does not work, you can use this link: <a href="https://harvestfundmanagement.com/auth/signin">https://harvestfundmanagement.com/auth/signin</a></p>
    <p>Best regards,<br />The Harvest Fund Management Team</p>
  </div>
`;
    const mail = await sendEmail(
      fundManager.email,
      'Your Account is verified',
      emailContent
    );

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: addedBy.toString(),
        action: LogActions.ACCEPT_FUNDMANAGER_REQUEST,
        entity: LogEntity.USER,
        entityId: id.toString(),
      });
    } catch { }
    return mail;
  }

  async getUserWithAccountDetail(investorId: string): Promise<User> {
    // Fetch the User with the AccountDetail populated
    let user = await this.userModel
      .findById(investorId)
      .populate('accountDetail walletId') // Populate the AccountDetail reference
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async verifyConnectedAccount(connectAccountId: string): Promise<Boolean> {
    // Fetch the User with the AccountDetail populated
    const user = await this.userModel
      .findOne({ connectAccountId: connectAccountId })
      .populate('accountDetail') // Populate the AccountDetail reference
      .exec();

    if (!user) {
      return false;
    }
    console.log("user ", user)
    user.isConnectAccountVerified = true;
    await user.save()

    return true;
  }

  async getAllInvestors(
    addedBy: string,
    page?: number,
    limit?: number,
    isAccepted?: boolean
  ): Promise<{ data: User[]; total: number }> {
    const filter = {
      role: UserRole.INVESTOR,
      addedBy: new Types.ObjectId(addedBy),
      isDeleted: false,
    };
    if (isAccepted || isAccepted == false) {
      filter['isAccepted'] = isAccepted;
    }

    let query = this.userModel.find(filter);

    if (page && limit) {
      query = query.skip((page - 1) * limit).limit(limit);
    }
    const data = await query.exec();
    const total = await this.userModel.countDocuments(filter).exec();

    return { total, data };
  }

  async createOrUpdateAccountDetail(
    investorId: string,
    accountDetailData: Partial<AccountDetail>
  ) {
    // Find or create the account detail
    const accountDetail = await this.accountDetailModel.findOneAndUpdate(
      { investorId: new Types.ObjectId(investorId) },
      { ...accountDetailData, investorId: new Types.ObjectId(investorId) },
      { new: true, upsert: true } // Create if not found, return updated document
    );

    // Update the user's accountDetail reference
    await this.userModel.findByIdAndUpdate(
      investorId,
      { accountDetail: accountDetail._id }, // Set the single reference
      { new: true }
    );

    return accountDetail;
  }

  async createStripeConnectAccount(userId: any): Promise<any> {
    try {

      const account = await this.stripe.accounts.create({
        type: 'custom',
        country: 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      // Update the user with the connect account ID
      const updatedUser = await this.userModel.findByIdAndUpdate(userId, { connectAccountId: account.id }, { new: true });


      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        type: "account_onboarding",
        refresh_url: `http://localhost:5000/api/users/verifyAccount/${account.id}`,
        return_url: `http://localhost:5000/api/users/verifyAccount/${account.id}`,
      });
      console.log("ACCOUNT LINK", accountLink);
      return {
        success: true,
        message: 'Stripe Connect account created successfully',
        accountLink,
      };
    } catch (error) {
      console.log("error ", error)
      return {
        success: false,
        message: 'Failed to create Stripe Connect account',
        error: error.message,
      };
    }
  }

  async getConnectedAccountDetails(connectAccountID: string): Promise<any> {
    try {
      const account = await this.stripe.accounts.retrieve(connectAccountID);
      return {
        success: true,
        message: 'Connected account details retrieved successfully',
        account,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve connected account details',
        error: error.message,
      };
    }
  }

}
