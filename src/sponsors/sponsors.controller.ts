// sponsors/sponsors.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
  UseInterceptors,
} from '@nestjs/common';
import { SponsorsService } from './sponsors.service';
import { CreateSponsorDto, UpdateSponsorDto } from './sponsors.dto';
import { JwtAuthGuard } from 'src/middleware/jwt-auth.guard';
import { Request } from 'express';
import { UserRole } from 'src/schemas/user.schema';
import { JwtPayload } from 'src/middleware/jwt-payload.interface';
import { FundManagerGuard } from '../middleware/custom.guard';
import { InjectUserIdInterceptor } from '../middleware/inject-userid.interceptor';

@UseGuards(JwtAuthGuard, FundManagerGuard)
@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  // Create a new sponsor
  @Post()
  @UseInterceptors(InjectUserIdInterceptor)
  create(@Body() createSponsorDto: CreateSponsorDto) {
    return this.sponsorsService.create(createSponsorDto);
  }

  // Get all sponsors with optional pagination
  @Get()
  findAll(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('fundmanagerId') fundmanagerId?: string
  ) {
    return this.sponsorsService.findAll(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      fundmanagerId || (req.user as JwtPayload).userId
    );
  }

  // Get all deleted sponsors with optional pagination
  @Get('Deleted')
  findAllDeleted(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('fundmanagerId') fundmanagerId?: string
  ) {
    return this.sponsorsService.findAllDeleted(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      fundmanagerId || (req.user as JwtPayload).userId
    );
  }

  // Get a single sponsor by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sponsorsService.findOne(id);
  }

  // Update a sponsor by ID
  @Put(':id')
  @UseInterceptors(InjectUserIdInterceptor)
  update(@Param('id') id: string, @Body() updateSponsorDto: UpdateSponsorDto) {
    return this.sponsorsService.update(id, updateSponsorDto);
  }

  // Soft delete a sponsor by ID
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sponsorsService.remove(id);
  }

  // Restore a soft-deleted sponsor by ID
  @Put(':id/restore')
  restore(@Param('id') id: string) {
    return this.sponsorsService.restore(id);
  }
}
