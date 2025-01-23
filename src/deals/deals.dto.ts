import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsMongoId,
  IsDateString,
  Length,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DealType, InvestmentType } from '../schemas/deals.schema';
import { PartialType } from '@nestjs/mapped-types';
import { SoftCommitEnum, StatusEnum } from 'src/schemas/dealDisclosure.schema';

class InterestRateDto {
  @IsNumber({}, { message: 'Interest rate "from" must be a number' })
  @Min(0, { message: 'Interest rate "from" must be at least 0' })
  @IsNotEmpty({ message: 'Interest rate "from" is required' })
  from: number;

  @IsNumber({}, { message: 'Interest rate "to" must be a number' })
  @Min(0, { message: 'Interest rate "to" must be at least 0' })
  @IsNotEmpty({ message: 'Interest rate "to" is required' })
  to: number;
}

class ImageDto {
  @IsString({ message: 'Image path must be a string' })
  @IsNotEmpty({ message: 'Image path is required' })
  path: string;

  @IsString({ message: 'Image URL must be a string' })
  @IsNotEmpty({ message: 'Image URL is required' })
  url: string;
}

export class CreateDealDto {
  @IsOptional()
  @IsMongoId({ message: 'Invalid sponsor ID' })
  @IsNotEmpty({ message: 'Sponsor ID is required' })
  sponsorId: string;

  @IsEnum(DealType, { message: 'Invalid deal type' })
  @IsNotEmpty({ message: 'Deal type is required' })
  dealType: DealType;

  @IsString({ message: 'Deal name must be a string' })
  @IsNotEmpty({ message: 'Deal name is required' })
  @Length(2, 100, {
    message: 'Deal name must be between 2 and 100 characters',
  })
  dealName: string;

  @IsString({ message: 'Lookup code must be a string' })
  @IsNotEmpty({ message: 'Lookup code is required' })
  @Length(2, 50, {
    message: 'Lookup code must be between 2 and 50 characters',
  })
  lookupCode: string;

  @IsBoolean({ message: 'isPhysicalAddress must be a boolean' })
  isPhysicalAddress: boolean;

  @IsString({ message: 'Address1 must be a string' })
  @IsNotEmpty({ message: 'Address1 is required' })
  @Length(2, 100, {
    message: 'Address1 must be between 2 and 100 characters',
  })
  address1: string;

  @IsOptional()
  @IsString({ message: 'Address2 must be a string' })
  @Length(0, 100, {
    message: 'Address2 can be up to 100 characters',
  })
  address2?: string;

  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City is required' })
  @Length(2, 50, {
    message: 'City must be between 2 and 50 characters',
  })
  city: string;

  @IsString({ message: 'Country must be a string' })
  @IsNotEmpty({ message: 'Country is required' })
  @Length(2, 50, {
    message: 'Country must be between 2 and 50 characters',
  })
  country: string;

  @IsString({ message: 'State must be a string' })
  @IsNotEmpty({ message: 'State is required' })
  @Length(2, 50, {
    message: 'State must be between 2 and 50 characters',
  })
  state: string;

  @IsString({ message: 'Zip code must be a string' })
  @IsNotEmpty({ message: 'Zip code is required' })
  @Length(5, 10, {
    message: 'Zip code must be between 5 and 10 characters',
  })
  zipCode: string;

  @IsEnum(InvestmentType, { message: 'Invalid investment type' })
  @IsNotEmpty({ message: 'Investment type is required' })
  investmentType: InvestmentType;

  @ValidateNested()
  @Type(() => InterestRateDto)
  @IsNotEmpty({ message: 'Interest rate is required' })
  interestRate: InterestRateDto;

  @IsString({ message: 'Asset class must be a string' })
  @IsNotEmpty({ message: 'Asset class is required' })
  @Length(2, 50, {
    message: 'Asset class must be between 2 and 50 characters',
  })
  assetClass: string;

  @IsString({ message: 'Life of investment must be a string' })
  @IsNotEmpty({ message: 'Life of investment is required' })
  @Length(2, 50, {
    message: 'Life of investment must be between 2 and 50 characters',
  })
  lifeOfInvestment: string;

  @IsString({ message: 'Earning layout must be a string' })
  @IsNotEmpty({ message: 'Earning layout is required' })
  @Length(2, 50, {
    message: 'Earning layout must be between 2 and 50 characters',
  })
  earningLayout: string;

  @IsOptional()
  @IsDateString({}, { message: 'Estimated exit date must be a valid date' })
  estimatedExitDate?: String;

  @IsNumber({}, { message: 'Raise amount must be a number' })
  @Min(0, { message: 'Raise amount must be at least 0' })
  @IsNotEmpty({ message: 'Raise amount is required' })
  raiseAmount: number;

  @IsOptional()
  @IsDateString({}, { message: 'Close date must be a valid date' })
  closeDate?: String;

  @IsOptional()
  @IsBoolean({ message: 'isVisible must be a boolean' })
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isDeleted must be a boolean' })
  isDeleted?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isInvestment must be a boolean' })
  isInvestment?: boolean;

  @IsOptional()
  @IsMongoId({ message: 'Invalid fund manager ID' })
  fundManager?: string;

  @IsArray({ message: 'Images must be an array' })
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  @IsOptional()
  imagesUrl?: ImageDto[];
}

// DTO for InvestorDetails array
class InvestorDetailDto {
  @IsMongoId()
  @IsNotEmpty()
  investorId: string;

  @IsEnum(SoftCommitEnum)
  softCommit: SoftCommitEnum;

  @IsEnum(StatusEnum)
  status: StatusEnum;

  @IsBoolean()
  viewDocument: boolean;

  @IsString()
  @IsNotEmpty()
  documentType: string;
}

// Main DTO for DealDisclosure
export class CreateDealDisclosureDto {
  @IsMongoId()
  @IsNotEmpty()
  dealId: string;

  @IsString()
  @IsNotEmpty()
  documentUrl: string;

  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvestorDetailDto)
  investorDetails: InvestorDetailDto[];
}

export class UpdateInvestorDetailsDto {
  @IsMongoId()
  @IsNotEmpty({ message: 'InvestorId is required.' })
  investorId: string;

  @IsOptional()
  @IsEnum(StatusEnum, {
    message: `Status must be one of: ${Object.values(StatusEnum).join(', ')}`,
  })
  status?: StatusEnum;

  @IsOptional()
  @IsEnum(SoftCommitEnum, {
    message: `SoftCommit must be one of: ${Object.values(SoftCommitEnum).join(', ')}`,
  })
  softCommit?: SoftCommitEnum;

  @IsOptional()
  viewDocument?: boolean;
}

export class UpdateDealDto extends PartialType(CreateDealDto) {}
