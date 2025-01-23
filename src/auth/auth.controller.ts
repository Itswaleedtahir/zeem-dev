import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ResetPasswordDto,
  signInDto,
  signUpDto,
  VerifyOtpDto,
} from './auth.dto';
import { Response } from 'express';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/middleware/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'src/middleware/jwt-payload.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { dynamicFileUpload, deleteFile } from '../utils/upload.utils';
import * as multer from 'multer';
import { readdirSync } from 'fs';
import { join } from 'path';
import { sendEmail } from '../utils/communication';
import { ClientSecretCredential } from '@azure/identity';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Get('list-all-files')
  getAllFiles() {
    // Path to the upload folder
    const uploadDir = join(__dirname, '../../uploads');

    // Read all files in the upload folder
    const files = readdirSync(uploadDir);

    // Return the list of files with their full URLss
    return files.map(file => ({
      filename: file,
      url: `https://harvestfundmanagement.com/api/uploads/${file}`,
    }));
  }

  @Post('/signup')
  signUp(@Body() signUpDto: signUpDto) {
    // return this.authService.signUp(signUpDto);
    return this.authService.newSignUp(signUpDto);
  }

  @Post('/login')
  signIn(@Body() signInDto: signInDto) {
    return this.authService.signIn(signInDto);
  }
  // @UseGuards(JwtAuthGuard)
  @Get('microsoft')
  login(@Res() res: Response, @Req() req: Request) {
    const url = this.authService.getAuthUrl();
    return res.redirect(url);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    try {
      await this.authService.storeToken(code);
      res.send('OAuth2 flow completed and token saved.');
    } catch (error) {
      console.error('Error in callback:', error);
      return res.status(500).send('Error in OAuth callback');
    }
  }

  //testing with file but issue with client provided account
  @Post('send-mail')
  async sendMail(
    @Body('to') to: string,
    @Body('subject') subject: string,
    @Body('body') body: string
  ) {
    try {
      await sendEmail(to, subject, body);

      return { message: 'Mail sent successfully' };
    } catch (error) {
      console.error('Error in sendMail:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('send-invitation')
  async sendInvitation(@Query('email') email: string, @Req() req: Request) {
    if (!email) {
      throw new BadRequestException('Email query parameter is required');
    }
    const authorizationHeader = req.headers['authorization'];
    if (!authorizationHeader) {
      throw new BadRequestException('Authorization header not found');
    }

    const token = authorizationHeader.split(' ')[1]; // Bearer <token>
    const addedBy = (req.user as JwtPayload).userId;
    return this.authService.inviteUserByEmail(email, token, addedBy);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: Request
  ) {
    return await this.authService.changePassword(
      (req.user as JwtPayload).userId,
      changePasswordDto
    );
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.handleForgotPassword(email);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;
    return this.authService.verifyOtp(email, otp);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { email, newPassword } = resetPasswordDto;
    return this.authService.resetPassword(email, newPassword);
  }

  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    try {
      // Call dynamicFileUpload to handle either S3 or local upload
      const { filePath, fileUrl, message } = await dynamicFileUpload(file);
      return {
        message,
        filePath, // Path to store in the database (relative path or filename)
        fileUrl, // Full URL (S3 or local URL)
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('File upload failed');
    }
  }

  @Delete('delete-file')
  async deleteFile(@Query('filePath') filePath: string) {
    const result = await deleteFile(filePath);
    return { message: result };
  }
}
