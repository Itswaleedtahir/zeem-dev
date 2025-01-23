import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Enums for softCommit and status
export enum SoftCommitEnum {
  COMMITTED = 'COMMITTED',
  REJECTED = 'REJECTED',
}

export enum StatusEnum {
  SIGNED = 'SIGNED',
  UNSIGNED = 'UNSIGNED',
}

@Schema({ timestamps: true })
export class DealDisclosure extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Deal', required: true })
  dealId: Types.ObjectId;

  @Prop({ required: true })
  documentUrl: string;

  @Prop({ required: true })
  documentType: string;

  @Prop({
    type: [
      {
        investorId: { type: Types.ObjectId, ref: 'User', required: true },
        softCommit: {
          type: String,
          enum: Object.values(SoftCommitEnum),
          required: true,
        },
        status: {
          type: String,
          enum: Object.values(StatusEnum),
          required: true,
        },
        viewDocument: { type: Boolean, default: false },
        documentType: { type: String, required: true },
      },
    ],
    default: [],
  })
  investorDetails: Array<{
    investorId: Types.ObjectId;
    softCommit: SoftCommitEnum;
    status: StatusEnum;
    viewDocument: boolean;
    documentType: string;
  }>;

  @Prop({ type: Boolean, default: false }) // Soft delete flag
  isDeleted: boolean;

  @Prop({ type: Boolean, default: false }) // New field for payment status
  isPaid: boolean;

  @Prop({ type: String, default: '' }) // New field for payment intent ID
  paymentIntentId: string;
}

export const DealDisclosureSchema = SchemaFactory.createForClass(DealDisclosure);
