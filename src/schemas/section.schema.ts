import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Section extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deal', required: false, default: null })
  dealId: Types.ObjectId;

  @Prop({ required: true })
  section: string;
}

export const SectionSchema = SchemaFactory.createForClass(Section);
