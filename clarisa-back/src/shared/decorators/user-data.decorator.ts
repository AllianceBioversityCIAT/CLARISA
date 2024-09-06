import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserData } from '../interfaces/user-data';
import { Request } from 'express';
import { Immutable } from '../utils/deep-immutable';

export const GetUserData = createParamDecorator(
  (ctx: Immutable<ExecutionContext>) => {
    const request: Request = ctx.switchToHttp().getRequest();
    return request.user as UserData;
  },
);
