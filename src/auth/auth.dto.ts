import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  IsEnum,
  IsOptional,
  MaxLength,
  Matches,
  IsPhoneNumber,
} from 'class-validator';
import { Types } from 'mongoose';
import { UserRole } from 'src/schemas/user.schema';

export class signUpDto {
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter a valid email' })
  readonly email: string;

  // @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,20}$/, {
    message:
      'Password too weak. It must contain 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
  })
  readonly password: string;

  @IsNotEmpty()
  // @IsOptional()
  @IsEnum(UserRole, {
    message: 'role must be one of: superAdmin, fundManager, investor',
  })
  readonly role: UserRole;

  @IsNotEmpty()
  @IsOptional()
  readonly addedBy?: Types.ObjectId;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  readonly verify: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || null)
  readonly company: string;

  @IsNotEmpty()
  @IsPhoneNumber(null, { message: 'Phone number is not valid' }) // 'null' for default validation (any country)
  phoneNo?: string;
}

export class signInDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter correct email' })
  readonly email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  readonly password: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,20}$/, {
    message:
      'Password too weak. It must contain 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
  })
  newPassword: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  @MaxLength(20, { message: 'New password must not exceed 20 characters.' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,20}$/, {
    message:
      'Password too weak. It must contain 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
  })
  newPassword: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'OTP must be at least 6 characters long.' })
  @MaxLength(6, { message: 'OTP must not exceed 6 characters.' })
  otp: string;
}
