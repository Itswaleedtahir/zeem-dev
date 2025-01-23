import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from '../schemas/user.schema';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import {
  AccountDetail,
  AccountDetailSchema,
} from '../schemas/accountDetail.schema';
import { Wallet, WalletSchema} from 'src/schemas/wallet.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AccountDetail.name, schema: AccountDetailSchema },
      { name: Wallet.name, schema: WalletSchema }, 
    ]),

    ActivityLogModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
