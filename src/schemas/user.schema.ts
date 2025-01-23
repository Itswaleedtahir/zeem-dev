import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AccountDetail } from './accountDetail.schema';

export enum UserRole {
  SUPER_ADMIN = 'superAdmin',
  FUND_MANAGER = 'fundManager',
  INVESTOR = 'investor',
}
@Schema({
  timestamps: true,
  toJSON: {
    virtuals: false,
    transform: function (doc, ret) {
      delete ret.password; // Exclude password field from the response
      return ret;
    },
  },
})
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false, default: '' })
  company: string;

  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ unique: true, required: false })
  phoneNo: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, required: true, enum: UserRole })
  role: UserRole;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  addedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Wallet' })
  walletId: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ default: false })
  isAccepted: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: String, required: false })
  otp: string;

  @Prop({ type: Date, required: false })
  otpExpiry: Date;

  @Prop({ required: false })
  photoPath: string; // Path of the photo on the server

  @Prop({ required: false })
  photoUrl: string; // Public URL for accessing the photo

  @Prop({ required: false })
  logoPath: string; // Path of the photo on the server

  @Prop({ required: false })
  logoUrl: string; // Public URL for accessing the photo

  @Prop({ required: false })
  connectAccountId: string; // Public URL for accessing the photo

  @Prop({ default: false,required: false})
  isConnectAccountVerified: boolean; // Public URL for accessing the photo

  @Prop({ default: false, required: false })
  isOtpVerified: boolean;

  @Prop({ type: [Date], default: [] })
  inviteSendAt: Date[];

  @Prop({ type: Types.ObjectId, ref: AccountDetail.name })
  accountDetail: Types.ObjectId; // Reference to one AccountDetail
}

export const UserSchema = SchemaFactory.createForClass(User);
