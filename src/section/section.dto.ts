import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';

export class CreateSectionDto {
  @IsOptional()
  @IsMongoId({ message: 'Invalid User ID format. Must be a valid MongoID.' })
  @IsNotEmpty({ message: 'User ID is required.' })
  userId: string;

  @IsMongoId({ message: 'Invalid User ID format. Must be a valid MongoID.' })
  @IsNotEmpty({ message: 'Deal ID is required.' })
  dealId: string;

  @IsString({ message: 'Section must be a string.' })
  @IsNotEmpty({ message: 'Section name is required.' })
  section: string;
}

export class UpdateSectionDto {
  @IsString({ message: 'Section must be a string.' })
  section?: string;
}
