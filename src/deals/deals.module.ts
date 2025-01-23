import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { Deal, DealSchema } from 'src/schemas/deals.schema';
import { InjectUserIdInterceptor } from '../middleware/inject-userid.interceptor';
import { UsersModule } from 'src/users/users.module';
import { DocumentsModule } from 'src/documents/documents.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import {
  DealDisclosure,
  DealDisclosureSchema,
} from 'src/schemas/dealDisclosure.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Deal.name, schema: DealSchema },
      { name: DealDisclosure.name, schema: DealDisclosureSchema },
    ]),
    UsersModule,
    ActivityLogModule,
    DocumentsModule,
  ],
  controllers: [DealsController],
  providers: [DealsService, InjectUserIdInterceptor],
  exports: [DealsService],
})
export class DealsModule {}
