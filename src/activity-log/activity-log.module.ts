import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLog, ActivityLogSchema } from '../schemas/activity-log.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Deal, DealSchema } from '../schemas/deals.schema';
import { Section, SectionSchema } from 'src/schemas/section.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Deal.name, schema: DealSchema },
      { name: Section.name, schema: SectionSchema },
    ]),
  ],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService], // Export the service if other modules need it
})
export class ActivityLogModule {}
