import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class InjectUserIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = (request.user as JwtPayload).userId;

    if (!request.body.fundManager) {
      request.body.fundManager = userId;
    }

    return next.handle();
  }
}
