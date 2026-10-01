import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { UserData } from '../../shared/interfaces/user-data';
import { UserAccess, UserAccessService } from './user-access.service';

/**
 * `GET api/users/me/access`: any signed-in user reads their own roles and
 * permissions (the panel builds its menu from it). Only `JwtAuthGuard`: the
 * answer is about the caller, never about somebody else.
 */
@ApiExcludeController()
@Controller()
export class UserAccessController {
  constructor(private readonly _userAccessService: UserAccessService) {}

  @Get('me/access')
  @UseGuards(JwtAuthGuard)
  getMyAccess(@GetUserData() userData: UserData): Promise<UserAccess> {
    return this._userAccessService.getAccess(userData?.email);
  }
}
