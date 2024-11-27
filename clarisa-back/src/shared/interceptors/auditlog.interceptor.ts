import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuditlogInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    //TODO implement the logging ONLY for PATCH requests
    console.log('before...');

    const before = Date.now();

    return next
      .handle()
      .pipe(
        tap(() =>
          console.log(`intercepted... we took ${Date.now() - before}ms`),
        ),
      );
  }
}
