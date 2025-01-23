import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { Comment, CommentSchema } from '../schemas/comment.schema';
import { DealsModule } from '../deals/deals.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
    DealsModule,
    ActivityLogModule,
  ],
  controllers: [CommentController], // Register the controller
  providers: [CommentService], // Register the service
  exports: [CommentService], // Export the service (optional, in case other modules need it)
})
export class CommentModule {}
