import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { UserData } from '../../shared/interfaces/user-data';
import { AccessAdminService } from './access-admin.service';
import {
  AccessAdminRoleDto,
  AccessAdminUserDto,
  AddMembersResultDto,
  AddRoleMembersDto,
  CreateRoleDto,
  ListMembersQueryDto,
  ListUsersQueryDto,
  PageDto,
  PermissionGroupDto,
  RemoveMemberResultDto,
  RemoveRoleMemberDto,
  SetRolePermissionsDto,
  UpdateRoleDto,
} from './dto/access-admin.dto';

/** Same options every admin controller of the repo uses (no global pipe). */
export const ACCESS_ADMIN_VALIDATION_PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

/**
 * Roles and users administration of the panel, mounted at
 * `api/access-admin` (see `api.routes.ts`).
 *
 * `JwtAuthGuard` proves who calls; `PermissionGuard` requires the permission
 * `/api/access-admin` (seeded for SA by `AddRolesUsersAdmin1790600000000`).
 * The finer rules (subset, super-only SA, last SA…) are enforced by the
 * service. Excluded from the public OpenAPI document.
 */
@ApiExcludeController()
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@UsePipes(ACCESS_ADMIN_VALIDATION_PIPE)
export class AccessAdminController {
  constructor(private readonly _service: AccessAdminService) {}

  @Get('users')
  listUsers(
    @Query() query: ListUsersQueryDto,
  ): Promise<PageDto<AccessAdminUserDto>> {
    return this._service.listUsers(query);
  }

  @Get('roles')
  listRoles(): Promise<AccessAdminRoleDto[]> {
    return this._service.listRoles();
  }

  @Post('roles')
  createRole(
    @Body() dto: CreateRoleDto,
    @GetUserData() userData: UserData,
  ): Promise<AccessAdminRoleDto> {
    return this._service.createRole(dto, userData);
  }

  @Patch('roles/:id')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @GetUserData() userData: UserData,
  ): Promise<AccessAdminRoleDto> {
    return this._service.updateRole(id, dto, userData);
  }

  @Put('roles/:id/permissions')
  setRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetRolePermissionsDto,
    @GetUserData() userData: UserData,
  ): Promise<AccessAdminRoleDto> {
    return this._service.setRolePermissions(id, dto, userData);
  }

  @Get('roles/:id/members')
  listMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListMembersQueryDto,
  ): Promise<PageDto<AccessAdminUserDto>> {
    return this._service.listMembers(id, query);
  }

  /** Bulk and idempotent: 200 even when everybody already held the role. */
  @Post('roles/:id/members')
  @HttpCode(HttpStatus.OK)
  addMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddRoleMembersDto,
    @GetUserData() userData: UserData,
  ): Promise<AddMembersResultDto> {
    return this._service.addMembers(id, dto, userData);
  }

  @Delete('roles/:id/members/:userId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: RemoveRoleMemberDto,
    @GetUserData() userData: UserData,
  ): Promise<RemoveMemberResultDto> {
    return this._service.removeMember(id, userId, dto, userData);
  }

  @Get('permissions')
  listPermissions(): Promise<PermissionGroupDto[]> {
    return this._service.listPermissions();
  }
}
