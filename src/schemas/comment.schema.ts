import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Deal } from './deals.schema';
import { User } from './user.schema';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({
  timestamps: true, // automatically creates createdAt and updatedAt fields
})
export class Comment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  investorId: User; // References User collection

  @Prop({ type: Types.ObjectId, ref: 'Deal', required: true })
  dealId: Deal; // References Deal collection

  @Prop({ type: String, required: true })
  comment: string; // The actual comment content

  @Prop({ default: false })
  isDeleted: boolean; // Soft delete flag

  @Prop({ default: false })
  isHidden: boolean; // Flag to hide the comment from view

  @Prop({
    type: String,
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus; // Status of the comment approval process
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Create a compound unique index to ensure one comment per investor per deal
CommentSchema.index({ investorId: 1, dealId: 1 }, { unique: true });
