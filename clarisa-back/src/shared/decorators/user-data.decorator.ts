import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDataDto } from '../entities/dtos/user-data.dto';

export const GetUserData = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserDataDto;
  },
);
