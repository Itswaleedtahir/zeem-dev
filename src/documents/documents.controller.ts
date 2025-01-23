import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CreateDealDocumentDto, CreateDocumentDto } from './documents.dto';
import { JwtAuthGuard } from 'src/middleware/jwt-auth.guard';
import { Request } from 'express';
import { JwtPayload } from 'src/middleware/jwt-payload.interface';
import { DocumentType } from 'src/schemas/document.schema';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('search/deal')
  async searchDealDocuments(
    @Req() req: Request,
    @Query('searchTerm') searchTerm: string,
    @Query('userId') userId?: string
  ) {
    if (!searchTerm || searchTerm.trim() === '') {
      throw new BadRequestException('Search term is required');
    }
    userId = userId || (req.user as JwtPayload).userId;
    return this.documentsService.searchDocuments(
      DocumentType.DEAL,
      searchTerm,
      userId
    );
  }

  // Search for 'profile' documents based on title or keywords
  @Get('search/profile')
  async searchProfileDocuments(
    @Req() req: Request,
    @Query('searchTerm') searchTerm: string,
    @Query('userId') userId?: string
  ) {
    if (!searchTerm || searchTerm.trim() === '') {
      throw new BadRequestException('Search term is required');
    }
    userId = userId || (req.user as JwtPayload).userId;
    return this.documentsService.searchDocuments(
      DocumentType.PROFILE,
      searchTerm,
      userId
    );
  }

  @Get('user')
  async getDocumentsByUserId(
    @Req() req: Request,
    @Query('userId') userId: string
  ) {
    userId = userId || (req.user as JwtPayload).userId;

    return this.documentsService.getDocumentsByUserId(userId);
  }

  @Get('deal/:dealId')
  async getDocumentsByDealId(
    @Req() req: Request,
    @Param('dealId') dealId: string
  ) {
    if (!dealId) {
      throw new BadRequestException('dealId is required as param');
    }
    return this.documentsService.getDocumentsByDealId(dealId);
  }

  @Get(':id')
  async getDocumentById(@Param('id') id: string) {
    return this.documentsService.getDocumentById(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() req: Request
  ) {
    if (!file) {
      throw new BadRequestException('File is required for uploading');
    }
    if (!createDocumentDto.userId) {
      createDocumentDto.userId = (req.user as JwtPayload).userId;
    }
    return this.documentsService.addDocument(file, createDocumentDto);
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    return this.documentsService.deleteDocument(id);
  }

  @Post('deal')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDealDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDealDocumentDto: CreateDealDocumentDto,
    @Req() req: Request
  ) {
    if (!file) {
      throw new BadRequestException('File is required for uploading');
    }

    createDealDocumentDto.userId =
      createDealDocumentDto.userId || (req.user as JwtPayload).userId;
    return this.documentsService.addDealDocument(file, createDealDocumentDto);
  }
}
