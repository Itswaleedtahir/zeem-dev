import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from 'nestjs-pino';
import { LoggerOptions } from 'pino';
import { SponsorsModule } from './sponsors/sponsors.module';
import { PaymentModule } from './payment/payment.module';
import { UsersModule } from './users/users.module';
import { DealsModule } from './deals/deals.module';
import { CommentModule } from './comment/comment.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DocumentsModule } from './documents/documents.module';
import { SectionModule } from './section/section.module';
import { ActivityLogModule } from './activity-log/activity-log.module';

const loggerOptions: LoggerOptions = {
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
};

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: loggerOptions,
    }),
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.DB_URL),
    AuthModule,
    SponsorsModule,
    UsersModule,
    DealsModule,
    PaymentModule,
    CommentModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // Path to your uploads directory
      serveRoot: '/api/uploads',
    }),
    DocumentsModule,
    SectionModule,
    ActivityLogModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
