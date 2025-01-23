import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LogActions {
  CREATE = 'Create',
  UPDATE = 'Update',
  UPDATE_PROFILE_PIC = 'Update profile picture',
  UPDATE_LOGO_PIC = 'Update logo picture',
  DELETE_PROFILE_PIC = 'Delete profile picture',
  DELETE_LOGO_PIC = 'Delete logo picture',
  ACCEPT_FUNDMANAGER_REQUEST = 'Accepted fund manager account request',
  DELETE = 'Delete',
  RESTORE = 'Restore',
  SIG_IN = 'SignIn',
  FORGOT_PASSWORD = 'Request for password forgot',
  FORGOT_OTP_VERIFY = 'Verify forgot password otp',
  RESET_PASSWORD = 'Password reset',
  PASSWORD_CHANGE = 'Password changed',
  INVESTOR_INVITE = 'Investor invited',
  UPLOAD_DEAL_IMAGE = 'Upload deal image',
  APPROVAL_STATUS = 'Commit approval status changed',
  UPLOAD_USER_DOCUMENT = 'Upload user document',
  UPLOAD_DEAL_DOCUMENT = 'Upload deal document',
}

export enum LogEntity {
  COMMENT = 'Comment',
  DEALS = 'Deal',
  DOCUMENT = 'DocumentEntity',
  SECTION = 'Section',
  USER = 'User',
  WALLET = 'Wallet',
  SPONSOR = 'Sponsor',
}

@Schema({
  timestamps: true,
})
export class ActivityLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deal', required: false })
  dealId: Types.ObjectId;

  @Prop({ type: String, required: true })
  action: LogActions;

  @Prop({ type: String, required: false })
  entity: LogEntity;

  @Prop({ type: Types.ObjectId, required: false })
  entityId: Types.ObjectId;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
