import { Injectable, NestMiddleware, Next, Req } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { NextFunction, Request } from 'express';
import { Immutable } from '../utils/deep-immutable';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  constructor(private authService: Immutable<AuthService>) {}

  async use(
    @Req() request: Request,
    @Next() next: Immutable<NextFunction>,
  ): Promise<void> {
    const authHeader: string = request.headers.authorization ?? '';
    const basic: boolean = authHeader.toLocaleLowerCase().includes('basic');

    if (basic) {
      const token: string = authHeader.replace('Basic ', '');
      const auth: string = Buffer.from(token, 'base64').toString();
      const credentials: string[] = auth.split(':');

      await this.authService
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        .validateUser(credentials[0], credentials[1])
        .then((u) => {
          if (u) {
            return this.authService.login(u).then((l) => {
              request.headers.authorization = `Bearer ${l.access_token}`;
              return true;
            });
          }
          return false;
        })
        .catch(() => false);
    }
    next();
  }
}
