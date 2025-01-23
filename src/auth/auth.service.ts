import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from 'src/schemas/user.schema';
import { Wallet } from 'src/schemas/wallet.schema';
import { Token } from 'src/schemas/auth.token.schema';

import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ChangePasswordDto, signInDto, signUpDto } from './auth.dto';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as qs from 'qs';
import { sendEmail } from '../utils/communication'; // for bravo

import { randomBytes } from 'crypto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { LogActions, LogEntity } from 'src/schemas/activity-log.schema';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Wallet.name)
    private walletModel: Model<Wallet>,
    @InjectModel(Token.name) private tokenModel: Model<Token>,
    private jwtService: JwtService,
    private readonly activityLogService: ActivityLogService
  ) {}

  async generateRandomPassword(length: number = 8): Promise<string> {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?';
    const charactersLength = characters.length;

    let password = '';

    // Generate random password
    for (let i = 0; i < length; i++) {
      const randomIndex = randomBytes(1)[0] % charactersLength;
      password += characters.charAt(randomIndex);
    }

    return password;
  }

  async signUp(signUpDto: signUpDto) {
    const { name, email, password, verify, company, phoneNo } = signUpDto;
    console.log('signUpDto: ', signUpDto);

    let addedBy: Types.ObjectId;
    let parent: User;
    if (verify != UserRole.SUPER_ADMIN) {
      try {
        const decodedToken = this.jwtService.verify(verify);
        addedBy = new Types.ObjectId(decodedToken.userId);
      } catch (err) {
        throw new UnauthorizedException('Invalid or expired verify token');
      }
      parent = await this.userModel.findById(addedBy);
      if (!parent) {
        throw new UnauthorizedException('Parent User not found');
      }
      if (parent.role == UserRole.FUND_MANAGER && !password) {
        throw new BadRequestException('Password is required ');
      }
      if (parent.role == UserRole.SUPER_ADMIN && company == null) {
        throw new BadRequestException('Company is required ');
      }
    } else {
      if (!password) {
        throw new BadRequestException('Password is required ');
      }
    }

    let user = await this.userModel.findOne({ email });
    if (user) {
      if (user.role != UserRole.INVESTOR) {
        throw new ConflictException('Email already exists');
      }
    }
    let hashedPassword = '';
    let randomPassword = '';
    if (!password) {
      randomPassword = await this.generateRandomPassword(8);
      hashedPassword = await bcrypt.hash(randomPassword, 10);
    } else {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    if ((parent == undefined || null) && verify == UserRole.SUPER_ADMIN) {
      user = await this.userModel.create({
        name,
        email,
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        phoneNo,
      });
    } else if (parent.role == UserRole.SUPER_ADMIN) {
      user = await this.userModel.create({
        name,
        email,
        password: hashedPassword,
        role: UserRole.FUND_MANAGER,
        addedBy,
        company,
        phoneNo,
      });
    } else if (parent.role == UserRole.FUND_MANAGER) {
      if (!user) {
        throw new BadRequestException('Investor not found ');
      }
      user.name = name;
      user.password = hashedPassword;
      user.isAccepted = true;
      user.phoneNo = phoneNo;
    } else {
      throw new UnauthorizedException('Invalid role or addedBy reference');
    }

    if (user) {
      const wallet = await this.walletModel.create({
        userId: user._id,
        balance: 0,
      });
      user.walletId = wallet._id as Types.ObjectId;
      await user.save();
    }

    const token = this.jwtService.sign({ userId: user._id, role: user.role });

    const populatedUser = await this.userModel
      .findById(user._id)
      .populate({
        path: 'walletId',
        select: '_id balance',
      })
      .populate({
        path: 'addedBy',
        select: 'name email role',
      })
      .select('-password')
      .exec();

    if (randomPassword && randomPassword != '') {
      //use this code when we implement password sending throug email
      //     const subject = 'Invitation to Join ZeemDev';
      //     const body = `Hello,

      // You have been invited to join ZeemDev. Please click the link below to Login to your account:

      // link: http://
      // email: ${email}
      // password:${randomPassword}

      // Best regards,
      // ZeemDev Team`;
      //     return await sendEmail(email, subject, body);

      return { email: email, password: randomPassword };
    }
    return { user: populatedUser, token };
  }

  async newSignUp(signUpDto: signUpDto) {
    try {
      const { name, email, password, verify, company, phoneNo, role } =
        signUpDto;
      console.log('signUpDto: ', signUpDto);

      let addedBy: Types.ObjectId = null;
      let parent: User;
      if (role == UserRole.INVESTOR) {
        try {
          const decodedToken = this.jwtService.verify(verify);
          addedBy = new Types.ObjectId(decodedToken.userId);
        } catch (err) {
          throw new UnauthorizedException('Invalid or expired verify token');
        }
        parent = await this.userModel.findById(addedBy);
        if (!parent) {
          throw new UnauthorizedException('Parent User not found');
        }
      }
      if (role == UserRole.FUND_MANAGER && !company) {
        throw new BadRequestException(
          'Company is required for registring fund manager '
        );
      }

      let user = await this.userModel.findOne({ email });
      if (user) {
        if (user.role != UserRole.INVESTOR) {
          throw new ConflictException('Email already exists');
        }
      }
      let hashedPassword = await bcrypt.hash(password, 10);

      if (role == UserRole.SUPER_ADMIN) {
        user = await this.userModel.create({
          name,
          email,
          password: hashedPassword,
          role: UserRole.SUPER_ADMIN,
          phoneNo,
          isAccepted: true,
        });
      } else if (role == UserRole.FUND_MANAGER) {
        user = await this.userModel.create({
          name,
          email,
          password: hashedPassword,
          role: UserRole.FUND_MANAGER,
          addedBy,
          company,
          phoneNo,
        });
      } else if (role == UserRole.INVESTOR) {
        if (!user) {
          throw new BadRequestException('Investor not found ');
        }
        user.name = name;
        user.password = hashedPassword;
        user.isAccepted = true;
        user.phoneNo = phoneNo;
      } else {
        throw new UnauthorizedException('Invalid role or addedBy reference');
      }

      if (user) {
        const wallet = await this.walletModel.create({
          userId: user._id,
          balance: 0,
        });
        user.walletId = wallet._id as Types.ObjectId;
        await user.save();
      }

      let token = this.jwtService.sign({ userId: user._id, role: user.role });

      const populatedUser = await this.userModel
        .findById(user._id)
        .populate({
          path: 'walletId',
          select: '_id balance',
        })
        .populate({
          path: 'addedBy',
          select: 'name email role',
        })
        .select('-password')
        .exec();

      // Log the activity
      try {
        await this.activityLogService.logActivity({
          userId: user._id.toString(),
          action: LogActions.CREATE,
          entity: LogEntity.USER,
          entityId: user._id.toString(),
        });
      } catch {}

      if (role == UserRole.FUND_MANAGER) {
        return 'Request send sucessfully to Super Admin';
      }

      return { user: populatedUser, token };
    } catch (err) {
      throw new ConflictException(err);
    }
  }

  async signIn(signInDto: signInDto) {
    const { email, password } = signInDto;

    const user = await this.userModel
      .findOne({ email, isAccepted: true })
      .populate([
        {
          path: 'walletId',
          select: '_id balance',
        },
        {
          path: 'addedBy',
          select: 'name email role',
        },
      ])
      .populate('accountDetail');

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password or user is not verified'
      );
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }
    console.log("user",user)
    const token = this.jwtService.sign({ userId: user._id, role: user.role, email:user.email, addedByRole: (user.addedBy as any).role, addedById:user.addedBy._id});
    user.password = undefined;
    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: user._id.toString(),
        action: LogActions.SIG_IN,
        entity: LogEntity.USER,
        entityId: user._id.toString(),
      });
    } catch {}
    return { user, token };
  }

  getAuthUrl(): string {
    const clientId = this.configService.get<string>('CLIENT_ID');
    const redirectUri = this.configService.get<string>('REDIRECT_URI');
    const scope = this.configService.get<string>('SCOPE');
    const authUrl = this.configService.get<string>('AUTH_URL');
    const params = qs.stringify({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: `${scope} offline_access`,
      state: 'someRandomState',
    });

    return `${authUrl}?${params}`;
  }

  async refreshToken(token: Token): Promise<Token> {
    const tokenUrl = this.configService.get<string>('TOKEN_URL');
    const clientId = this.configService.get<string>('CLIENT_ID');
    const clientSecret = this.configService.get<string>('CLIENT_SECRET');
    const scope = this.configService.get<string>('SCOPE');

    const tokenResponse = await axios.post(
      tokenUrl,
      qs.stringify({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        scope,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    token.accessToken = access_token;
    token.refreshToken = refresh_token || token.refreshToken; // Some providers may not return a new refresh token
    token.expiresAt = expiresAt;

    await token.save();

    return token;
  }

  async storeToken(code: string): Promise<void> {
    const tokenUrl = this.configService.get<string>('TOKEN_URL');
    const clientId = this.configService.get<string>('CLIENT_ID');
    const clientSecret = this.configService.get<string>('CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('REDIRECT_URI');
    const scope = this.configService.get<string>('SCOPE');

    const tokenResponse = await axios.post(
      tokenUrl,
      qs.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        scope: `${scope} offline_access`,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    await this.tokenModel.findOneAndUpdate(
      {},
      { accessToken: access_token, refreshToken: refresh_token, expiresAt },
      { upsert: true } // Create a new document if none exists
    );
  }

  async inviteUserByEmail(email: string, token: string, addedBy: string) {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email }).exec();

    // Prepare the invitation link and email content
    const signupUrl = this.configService.get<string>('SIGNUP_URL');
    if (!signupUrl) {
      throw new Error('SIGNUP_URL is not defined in the environment variables');
    }

    const invitationLink = `${signupUrl}?email=${encodeURIComponent(email)}&token=${token}&role=${UserRole.INVESTOR}`;
    const subject = 'Invitation to Join ZeemDev';
    const body = `
      <p>Hello,</p>
      <p>You have been invited to join ZeemDev. Please click the link below to create your account:</p>
      <p><a href="${invitationLink}" target="_blank">Create Your Account</a></p>
      <p>Best regards,<br/>ZeemDev Team</p>
    `;

    let user;

    if (existingUser) {
      // If the user exists, add the current timestamp to the inviteSendAt array
      user = await this.userModel
        .findByIdAndUpdate(
          existingUser._id,
          { $push: { inviteSendAt: new Date() } },
          { new: true }
        )
        .exec();
    } else {
      // Create a new user and initialize the inviteSendAt array with the current timestamp
      user = await this.userModel.create({
        name: ' ',
        email,
        password: ' ',
        role: UserRole.INVESTOR,
        addedBy: new Types.ObjectId(addedBy),
        inviteSendAt: [new Date()],
      });
    }

    // Send the email
    const mailStatus = await sendEmail(email, subject, body);

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: user._id.toString(),
        action: LogActions.INVESTOR_INVITE,
        entity: LogEntity.USER,
        entityId: user._id.toString(),
      });
    } catch (error) {
      console.error('Error logging activity', error);
    }

    return { subject, invitationLink, mailStatus };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password cannot be the same as the current password'
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: user._id.toString(),
        action: LogActions.PASSWORD_CHANGE,
        entity: LogEntity.USER,
        entityId: user._id.toString(),
      });
    } catch {}

    return { message: 'Password updated successfully' };
  }

  async handleForgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // Expires in 15 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const subject = 'Password Reset OTP';
    const html = `<p>Your OTP for resetting your password is: <strong>${otp}</strong></p>`;
    await sendEmail(user.email, subject, html);

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: user._id.toString(),
        action: LogActions.FORGOT_PASSWORD,
        entity: LogEntity.USER,
        entityId: user._id.toString(),
      });
    } catch {}

    return { message: 'OTP sent to your email' };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (user.otpExpiry < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    // Invalidate OTP after successful verification
    user.otp = null;
    user.otpExpiry = null;
    user.isOtpVerified = true; // You can use this flag to ensure OTP is verified before resetting password
    await user.save();

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: user._id.toString(),
        action: LogActions.FORGOT_OTP_VERIFY,
        entity: LogEntity.USER,
        entityId: user._id.toString(),
      });
    } catch {}

    return { message: 'OTP successfully verified' };
  }

  async resetPassword(email: string, newPassword: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isOtpVerified) {
      throw new UnauthorizedException('OTP not verified');
    }

    // Check if the new password matches the current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password cannot be the same as the old password'
      );
    }

    // Hash the new password and save it
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.isOtpVerified = false; // Reset the OTP verification flag
    await user.save();

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: user._id.toString(),
        action: LogActions.RESET_PASSWORD,
        entity: LogEntity.USER,
        entityId: user._id.toString(),
      });
    } catch {}

    return { message: 'Password successfully reset' };
  }
}
