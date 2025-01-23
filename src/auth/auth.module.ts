import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Wallet, WalletSchema } from 'src/schemas/wallet.schema';
import { Token, TokenSchema } from 'src/schemas/auth.token.schema';
import { JwtStrategy } from 'src/middleware/jwt.strategy';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: configService.get<string>('JWT_EXPIRE') },
        };
      },
    }),

    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Token.name, schema: TokenSchema },
    ]),
    ActivityLogModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
