// src/activity-log/activity-log.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityLog } from '../schemas/activity-log.schema';
import { User } from '../schemas/user.schema';
import { Deal } from '../schemas/deals.schema';
import { CreateActivityLogDto } from './activity-log.dto';
import { Section } from 'src/schemas/section.schema';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLog>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Deal.name) private readonly dealModel: Model<Deal>,
    @InjectModel(Section.name) private readonly sectionModel: Model<Section>
  ) {}

  // Log an activity
  async logActivity(
    createActivityLogDto: CreateActivityLogDto
  ): Promise<ActivityLog> {
    if (!createActivityLogDto.userId) {
      throw new BadRequestException('UserId is required');
    }

    const newLog = new this.activityLogModel(createActivityLogDto);
    return await newLog.save();
  }

  async getUserActivities(userId: string, limit?: number): Promise<any[]> {
    if (!userId) {
      throw new BadRequestException('UserId is required');
    }

    const activities = await this.activityLogModel
      .find({ userId })
      .sort({ createdAt: -1 })
      // .limit(limit)
      .populate('userId', 'name email role')
      .exec();

    const result = [];

    for (const activity of activities) {
      let populatedEntity = null;

      if (activity.entity && activity.entityId) {
        switch (activity.entity) {
          case 'User':
            populatedEntity = await this.userModel.findById(activity.entityId);
            // .select('name email role');
            break;

          case 'Deal':
            populatedEntity = await this.dealModel.findById(activity.entityId);
            // .select('title description');
            break;

          case 'Section':
            populatedEntity = await this.sectionModel.findById(
              activity.entityId
            );
            // .select('title description');
            break;

          // Add more cases for other collections as needed

          default:
            populatedEntity = null;
            break;
        }
      }

      const activityObject = activity.toObject();
      (activityObject as any).effectedEntity = populatedEntity;

      result.push(activityObject);
    }

    return result;
  }
}
