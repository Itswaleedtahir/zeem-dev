import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { DealDisclosure } from './dealDisclosure.schema';

export enum PaymentStatus {
    PENDING = "Pending",
    COMPLETED = "Completed",
    FAILED = "Failed"
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
export class Payment extends Document {

   // Reference to User collection
   @Prop({ type: Types.ObjectId, ref: 'User', required: true })
   investorId: Types.ObjectId;
 @Prop({ type: Types.ObjectId, ref: 'User', required: true })
   fundManager: User;
   @Prop({ type: Types.ObjectId, ref: 'DealDisclosure', required: true })
   dealDisId: DealDisclosure;
   @Prop({ required: false })
   paymentIntentId: string;
   @Prop({ required: false })
   plaidTransferId: string;
   @Prop({ required: false })
   paymentMethodUsed: string;
   @Prop({ required: true, enum: PaymentStatus })
   status: PaymentStatus;
   @Prop({ required: false })
   customerId: string;
   @Prop({ required: true })
   dealId: string;
   @Prop({ required: true })
   amount: string;


}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
