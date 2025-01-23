import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SectionService } from './section.service';
import { CreateSectionDto, UpdateSectionDto } from './section.dto';
import { Section } from '../schemas/section.schema';
import { JwtAuthGuard } from 'src/middleware/jwt-auth.guard';
import { Request } from 'express';
import { JwtPayload } from 'src/middleware/jwt-payload.interface';

@UseGuards(JwtAuthGuard)
@Controller('sections')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  // Create a new section
  @Post()
  async create(
    @Body() createSectionDto: CreateSectionDto,
    @Req() req: Request
  ): Promise<Section> {
    if (!createSectionDto.userId) {
      createSectionDto.userId = (req.user as JwtPayload).userId;
    }
    return this.sectionService.create(createSectionDto);
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('dealId') dealId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('searchTerm') searchTerm?: string,
    @Query('sort') sort?: string
  ): Promise<{
    data: Section[];
    totalDocuments?: number;
    page?: number;
    limit?: number;
  }> {
    if (!dealId) {
      throw new BadRequestException('dealId is required');
    }
    if (sort) {
      sort = sort.toLowerCase();
      if (!['asc', 'desc'].includes(sort)) {
        throw new BadRequestException(
          'Invalid sort order. Use "asc" or "desc"'
        );
      }
    }
    return this.sectionService.findAll(
      dealId,
      Number(page),
      Number(limit),
      searchTerm,
      sort
    );
  }

  // Get a section by ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Section> {
    return this.sectionService.findOne(id);
  }

  // Update a section by ID
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSectionDto: UpdateSectionDto
  ): Promise<Section> {
    return this.sectionService.update(id, updateSectionDto);
  }

  // Delete a section by ID
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Section> {
    return this.sectionService.remove(id);
  }
}
