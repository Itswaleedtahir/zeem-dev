import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsUrl,
} from 'class-validator';
import { DocumentType } from 'src/schemas/document.schema';

export class CreateDocumentDto {
  @IsOptional()
  @IsNotEmpty({ message: 'User ID is required' })
  @IsMongoId({ message: 'User ID must be a valid ObjectId' })
  userId: string;

  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  // Document type with a default value of 'deal'
  @IsNotEmpty({ message: 'Document type is required' })
  @IsString({ message: 'Document type must be a string' })
  documentType: string = DocumentType.PROFILE;
}

export class CreateDealDocumentDto {
  @IsOptional()
  @IsMongoId({ message: 'User ID must be a valid ObjectId' })
  userId?: string;

  @IsNotEmpty({ message: 'Deal ID is required' })
  @IsMongoId({ message: 'Deal ID must be a valid ObjectId' })
  dealId: string;

  @IsNotEmpty({ message: 'Keywords is required' })
  @IsString({ message: 'Keywords must be a string' })
  keywords?: string;

  @IsNotEmpty({ message: 'Section is required' })
  @IsMongoId({ message: 'Section ID must be a valid ObjectId' })
  sectionId?: string;

  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  // Document type with a default value of 'deal'
  @IsNotEmpty({ message: 'Document type is required' })
  @IsString({ message: 'Document type must be a string' })
  documentType: string = DocumentType.DEAL;
}
