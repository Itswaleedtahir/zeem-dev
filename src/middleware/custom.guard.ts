import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';
import { UserRole } from '../schemas/user.schema';

@Injectable()
export class FundManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (user.role !== UserRole.FUND_MANAGER) {
      throw new ForbiddenException(
        'You do not have permission to perform this action'
      );
    }

    return true;
  }
}

@Injectable()
export class InvestorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (user.role !== UserRole.INVESTOR) {
      throw new ForbiddenException('Only investors can perform this action');
    }

    return true;
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only superAdmin can perform this action');
    }

    return true;
  }
}
