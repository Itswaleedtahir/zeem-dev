import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum DocumentType {
  DEAL = 'deal',
  PROFILE = 'profile',
}
@Schema({ timestamps: true })
export class DocumentEntity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deal', required: false, default: null })
  dealId: Types.ObjectId;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: false, default: null })
  keywords: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Section',
    required: false,
    default: null,
  })
  sectionId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  type?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true, enum: DocumentType })
  documentType: DocumentType;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentEntity);
