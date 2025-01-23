// src/activity-log/activity-log.controller.ts

import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { CreateActivityLogDto } from './activity-log.dto';
import { JwtAuthGuard } from 'src/middleware/jwt-auth.guard';
import { Request } from 'express';
import { JwtPayload } from 'src/middleware/jwt-payload.interface';

@UseGuards(JwtAuthGuard)
@Controller('activity-log')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  // Endpoint to create a new activity log
  @Post()
  async logActivity(@Body() createActivityLogDto: CreateActivityLogDto) {
    return this.activityLogService.logActivity(createActivityLogDto);
  }

  @Get()
  async getUserActivities(
    @Req() req: Request,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number
  ) {
    userId = userId || (req.user as JwtPayload).userId;
    return this.activityLogService.getUserActivities(userId, Number(limit));
  }
}
