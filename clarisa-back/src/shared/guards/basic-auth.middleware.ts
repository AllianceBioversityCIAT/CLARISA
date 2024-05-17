import { Injectable, NestMiddleware, Next, Req, Res } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuthService } from 'src/auth/auth.service';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  constructor(
    private moduleRef: ModuleRef,
    private authService: AuthService,
  ) {}

  async use(
    @Req() request: Request,
    @Res() response: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    const authHeader: string = request.headers.authorization ?? '';
    const basic: boolean = authHeader.toLocaleLowerCase().includes('basic');

    if (basic) {
      const token: string = authHeader.replace('Basic ', '');
      const auth: string = Buffer.from(token, 'base64').toString();
      const credentials: string[] = auth.split(':');

      await this.authService
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
