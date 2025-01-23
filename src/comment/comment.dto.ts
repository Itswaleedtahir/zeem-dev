import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import { Types } from 'mongoose';
import { PartialType } from '@nestjs/mapped-types';
import { ApprovalStatus } from '../schemas/comment.schema';

export class CreateCommentDto {
  @IsOptional()
  @IsMongoId({ message: 'Invalid investor ID' })
  @IsNotEmpty({ message: 'Investor ID is required' })
  investorId: Types.ObjectId; // References User

  @IsMongoId({ message: 'Invalid deal ID' })
  @IsNotEmpty({ message: 'Deal ID is required' })
  dealId: Types.ObjectId; // References Deal

  @IsString({ message: 'Comment must be a string' })
  @IsNotEmpty({ message: 'Comment is required' })
  comment: string;

  @IsOptional()
  @IsBoolean({ message: 'isHidden must be a boolean' })
  isHidden?: boolean; // Optional boolean for hiding comment, default: false

  @IsOptional()
  @IsEnum(ApprovalStatus, { message: 'Invalid approval status' })
  approvalStatus?: ApprovalStatus; // Optional field for approval status, default: PENDING
}

export class UpdateCommentDto extends PartialType(CreateCommentDto) {}
