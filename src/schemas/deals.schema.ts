import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum DealType {
  DEAL = 'deal',
  INVESTMENT = 'investment',
}

export enum InvestmentType {
  EQUITY = 'equity',
  DEBT = 'debt',
}

class InterestRate {
  @Prop({ required: true })
  from: number;

  @Prop({ required: true })
  to: number;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: false,
    transform: function (doc, ret) {
      return ret;
    },
  },
})
export class Deal extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Sponsor', required: false })
  sponsorId?: Types.ObjectId;

  @Prop({ type: String, enum: DealType, required: true })
  dealType: DealType;

  @Prop({ required: true })
  dealName: string;

  @Prop({ required: true })
  lookupCode: string;

  @Prop({ default: false })
  isPhysicalAddress: boolean;

  @Prop({ required: true })
  address1: string;

  @Prop()
  address2: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  zipCode: string;

  @Prop({ type: String, enum: InvestmentType, required: true })
  investmentType: InvestmentType;

  @Prop({ type: InterestRate, required: true })
  interestRate: InterestRate;

  @Prop({ required: true })
  assetClass: string;

  @Prop({ required: true })
  lifeOfInvestment: string;

  @Prop({ required: true })
  earningLayout: string;

  @Prop({ type: Date })
  estimatedExitDate: Date;

  @Prop({ required: true })
  raiseAmount: number;

  @Prop({ type: Date })
  closeDate: Date;

  @Prop({
    type: [
      {
        path: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    default: [],
  })
  imagesUrl: { path: string; url: string }[];

  @Prop({ default: true })
  isVisible: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  fundManager: Types.ObjectId;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ default: false })
  isInvestment: boolean;
}

export const DealSchema = SchemaFactory.createForClass(Deal);
