import { Module } from '@nestjs/common';
import { SectionController } from './section.controller';
import { SectionService } from './section.service';
import { Section, SectionSchema } from '../schemas/section.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Section.name, schema: SectionSchema }]),
    ActivityLogModule,
  ],
  controllers: [SectionController],
  providers: [SectionService],
})
export class SectionModule {}
