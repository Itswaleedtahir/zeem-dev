import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, strict: false })
export class AccountDetail {
  @Prop({ type: String, required: true })
  accountType?: string;

  @Prop({ type: String })
  accountName?: string;

  @Prop({ type: String })
  entityName?: string;

  @Prop({ type: String })
  socialSecurityNumber?: string;

  @Prop({ type: String })
  mailingAddress1?: string;

  @Prop({ type: String })
  mailingAddress2?: string;

  @Prop({ type: String })
  country?: string;

  @Prop({ type: String })
  city?: string;

  @Prop({ type: String })
  state?: string;

  @Prop({ type: String })
  zipCode?: string;

  @Prop({ type: String })
  beneficiaryFirstName?: string;

  @Prop({ type: String })
  beneficiaryLastName?: string;

  @Prop({ type: String })
  relationshipToAccountHolder?: string;

  @Prop({ type: String })
  beneficiaryPhoneNumber?: string;

  @Prop({ type: String })
  beneficiaryEmail?: string;

  @Prop({ type: String })
  beneficiaryAddress1?: string;

  @Prop({ type: String })
  beneficiaryAddress2?: string;

  @Prop({ type: String })
  beneficiaryCountry?: string;

  @Prop({ type: String })
  beneficiaryCity?: string;

  @Prop({ type: String })
  beneficiaryState?: string;

  @Prop({ type: String })
  beneficiaryZipCode?: string;

  @Prop({ type: String })
  sdiraAccountTitle?: string;

  @Prop({ type: String })
  custodianWebsite?: string;

  @Prop({ type: String })
  custodianEmail?: string;

  @Prop({ type: String })
  custodianPhoneNumber?: string;

  @Prop({ type: String })
  custodianEin?: string;

  @Prop({ type: String })
  custodianName?: string;

  @Prop({ type: String })
  custodianRoutingNumber?: string;

  @Prop({ type: String })
  custodianAccountNumber?: string;

  @Prop({ type: String })
  entityEin?: string;

  @Prop({ type: String })
  primaryAccountFirstName?: string;

  @Prop({ type: String })
  primaryAccountLastName?: string;

  @Prop({ type: String })
  primaryAccountSsn?: string;

  @Prop({ type: String })
  accountOwnership?: string;

  @Prop({ type: String })
  secondaryFirstName?: string;

  @Prop({ type: String })
  secondaryLastName?: string;

  @Prop({ type: String })
  secondarySsn?: string;

  @Prop({ type: String })
  secondaryPhoneNumber?: string;

  @Prop({ type: String })
  secondaryEmail?: string;

  @Prop({ type: String })
  secondaryAddress1?: string;

  @Prop({ type: String })
  secondaryAddress2?: string;

  @Prop({ type: String })
  secondaryCountry?: string;

  @Prop({ type: String })
  secondaryCity?: string;

  @Prop({ type: String })
  secondaryState?: string;

  @Prop({ type: String })
  secondaryZipCode?: string;

  @Prop({ type: String })
  taxClassification?: string;

  @Prop({ type: String })
  beneficialOwners?: string;

  @Prop({ type: String })
  trustUses?: string;

  @Prop({ type: String })
  establishmentState?: string;

  @Prop({ type: String })
  trustType?: string;

  @Prop({ type: String })
  revocability?: string;

  @Prop({ type: String })
  trustees?: string;

  @Prop({ type: String })
  partners?: string;

  @Prop({ type: String })
  executiveOfficers?: string;

  @Prop({ type: Boolean, default: false }) // Add isDeleted field
  isDeleted: boolean;

  // Reference to User collection
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  investorId: Types.ObjectId;
}

export type AccountDetailDocument = AccountDetail & Document;
export const AccountDetailSchema = SchemaFactory.createForClass(AccountDetail);

// Middleware to filter out undefined fields
AccountDetailSchema.pre('save', function (next) {
  const doc = this as any;
  Object.keys(doc.toObject()).forEach(key => {
    if (doc[key] === undefined || doc[key] === null || doc[key] === '') {
      delete doc[key];
    }
  });
  next();
});
