// sponsors/dto/create-sponsor.dto.ts
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsMongoId,
  Length,
  IsOptional,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateSponsorDto {
  @IsString({ message: 'Sponsor name must be a string' })
  @IsNotEmpty({ message: 'Sponsor name is required' })
  @Length(2, 50, {
    message: 'Sponsor name must be between 2 and 50 characters',
  })
  name: string;

  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  @Length(10, 500, {
    message: 'Description must be between 10 and 500 characters',
  })
  description: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString({ message: 'Contact number must be a string' })
  @IsNotEmpty({ message: 'Contact number is required' })
  @Length(10, 15, {
    message: 'Contact number must be between 10 and 15 characters',
  })
  contactNumber: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid fund manager ID' })
  @IsNotEmpty({ message: 'Fund manager ID is required' })
  fundManager: string;
}

export class UpdateSponsorDto extends PartialType(CreateSponsorDto) {}
