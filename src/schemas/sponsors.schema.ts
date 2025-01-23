import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

@Schema({
  timestamps: true,
})
export class Sponsor extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false, default: '' })
  description: string;

  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ required: true })
  contactNumber: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  fundManager: User;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const SponsorSchema = SchemaFactory.createForClass(Sponsor);
