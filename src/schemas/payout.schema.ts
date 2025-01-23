import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { DealDisclosure } from './dealDisclosure.schema';

// export enum PaymentStatus {
//     PENDING = "Pending",
//     COMPLETED = "Completed",
//     FAILED = "Failed"
// }

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
export class Payout extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: User;
    @Prop({ required: false })
    amount: string;
    @Prop({ required: false })
    stripePayoutId: string;
    @Prop({ default: "processing", required: false })
    status: string;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);
