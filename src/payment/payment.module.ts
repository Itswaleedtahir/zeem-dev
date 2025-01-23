import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment, PaymentSchema } from '../schemas/payment.schema';
import { DealDisclosure, DealDisclosureSchema } from '../schemas/dealDisclosure.schema'; // Import the schema
import { Wallet, WalletSchema } from '../schemas/wallet.schema'; 
import { User, UserSchema } from '../schemas/user.schema';
import { Payout, PayoutSchema } from 'src/schemas/payout.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: DealDisclosure.name, schema: DealDisclosureSchema }, // Register DealDisclosure model
      { name: Wallet.name, schema: WalletSchema }, // Register DealDisclosure model
      { name: User.name, schema: UserSchema },
      { name: Payout.name, schema: PayoutSchema },
    ]),
    // Import other modules as required, similar to ActivityLogModule in UsersModule
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
