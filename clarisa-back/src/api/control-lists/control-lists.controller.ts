import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { UserData } from '../../shared/interfaces/user-data';
import { UserAccessService } from '../user/user-access.service';
import { ControlListsEnabledGuard } from './control-lists-enabled.guard';
import { DataService } from './data.service';
import { EngineService } from './engine/engine.service';
import { FIELD_TYPES } from './engine/field-types';
import { Actor, ListsService } from './lists.service';

/** The operation id comes from the client: short text or nothing. */
function reqId(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 64) {
    throw new BadRequestException('The operation id is not valid.');
  }
  return value;
}

/**
 * Admin surface, mounted at `api/control-lists/admin`. `PermissionGuard`
 * authorises by route prefix:
 *   /api/control-lists/admin/schema → design lists   (role CL_DESIGNER)
 *   /api/control-lists/admin/data   → edit records   (roles CL_DESIGNER, CL_EDITOR)
 *   /api/control-lists/admin        → everything     (role SA)
 * WHICH lists a user reaches is decided by the roles they hold (owner role).
 *
 * Guards on the class, never per method: a unit test fails if a handler of
 * this controller can be reached without all three.
 */
@ApiExcludeController()
@Controller('admin')
@UseGuards(ControlListsEnabledGuard, JwtAuthGuard, PermissionGuard)
export class ControlListsAdminController {
  constructor(
    private readonly lists: ListsService,
    private readonly data: DataService,
    private readonly engine: EngineService,
    private readonly access: UserAccessService,
  ) {}

  private async actor(user: UserData): Promise<Actor> {
    const a = await this.access.getAccess(user?.email);
    return {
      userId: a.userId,
      roleIds: a.roles.map((r) => Number(r.id)),
      isSuper: a.isSuper,
    };
  }

  // ── design ──

  @Get('schema/types')
  types() {
    return Object.entries(FIELD_TYPES).map(([value, t]) => ({
      value,
      label: t.label,
    }));
  }

  /** Roles the user can give a list to. */
  @Get('schema/owners')
  async owners(@GetUserData() user: UserData) {
    const a = await this.access.getAccess(user?.email);
    return a.roles.map((r) => ({
      id: Number(r.id),
      acronym: r.acronym,
      description: r.description,
    }));
  }

  @Get('schema/lists')
  async allLists(@GetUserData() user: UserData) {
    return this.lists.all(await this.actor(user));
  }

  @Post('schema/lists')
  async createList(@Body() body: any, @GetUserData() user: UserData) {
    return this.lists.createList(body ?? {}, await this.actor(user));
  }

  /** Name and description only: the code and the owner role stay. */
  @Patch('schema/lists/:id')
  async updateList(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @GetUserData() user: UserData,
  ) {
    return this.lists.updateList(id, body ?? {}, await this.actor(user));
  }

  @Get('schema/lists/:id')
  async detail(
    @Param('id', ParseIntPipe) id: number,
    @GetUserData() user: UserData,
  ) {
    return this.lists.detail(id, await this.actor(user));
  }

  @Get('schema/lists/:id/sql')
  async sql(
    @Param('id', ParseIntPipe) id: number,
    @GetUserData() user: UserData,
  ) {
    const list = await this.lists.owned(id, await this.actor(user));
    return {
      sql:
        list.status === 'published'
          ? await this.engine.showCreate(list.table_name)
          : null,
    };
  }

  @Get('schema/lists/:id/delete-impact')
  async deleteImpact(
    @Param('id', ParseIntPipe) id: number,
    @GetUserData() user: UserData,
  ) {
    return this.lists.deleteImpact(id, await this.actor(user));
  }

  @Post('schema/lists/:id/fields')
  async addField(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @GetUserData() user: UserData,
  ) {
    return this.lists.addField(
      id,
      body ?? {},
      await this.actor(user),
      reqId(body?.request_id),
    );
  }

  @Post('schema/lists/:id/publish')
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @GetUserData() user: UserData,
  ) {
    return this.lists.publish(
      id,
      await this.actor(user),
      reqId(body?.request_id),
    );
  }

  @Delete('schema/lists/:id')
  async deleteList(
    @Param('id', ParseIntPipe) id: number,
    @GetUserData() user: UserData,
    @Query('request_id') requestId?: string,
  ) {
    return this.lists.deleteList(id, await this.actor(user), reqId(requestId));
  }

  @Get('schema/fields/:fieldId/impact')
  async impact(
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @GetUserData() user: UserData,
    @Query('action') action?: string,
    @Query('type') type?: string,
  ) {
    return this.lists.impact(
      fieldId,
      action === 'type' ? 'type' : 'delete',
      await this.actor(user),
      type,
    );
  }

  @Patch('schema/fields/:fieldId')
  async renameField(
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @Body() body: any,
    @GetUserData() user: UserData,
  ) {
    return this.lists.renameField(
      fieldId,
      body ?? {},
      await this.actor(user),
      reqId(body?.request_id),
    );
  }

  @Patch('schema/fields/:fieldId/type')
  async changeType(
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @Body() body: any,
    @GetUserData() user: UserData,
  ) {
    return this.lists.changeType(
      fieldId,
      body?.type,
      await this.actor(user),
      body?.confirm_affected,
      reqId(body?.request_id),
    );
  }

  /** Required, unique and filterable of a field that already exists. */
  @Patch('schema/fields/:fieldId/rules')
  async setRules(
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @Body() body: any,
    @GetUserData() user: UserData,
  ) {
    return this.lists.setRules(
      fieldId,
      body ?? {},
      await this.actor(user),
      reqId(body?.request_id),
    );
  }

  @Delete('schema/fields/:fieldId')
  async deleteField(
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @GetUserData() user: UserData,
    @Query('request_id') requestId?: string,
  ) {
    return this.lists.deleteField(
      fieldId,
      await this.actor(user),
      reqId(requestId),
    );
  }

  @Get('schema/ops')
  async ops(@GetUserData() user: UserData) {
    return this.lists.ops(await this.actor(user));
  }

  // ── records ──

  @Get('data/:code')
  async readRows(
    @Param('code') code: string,
    @Query() query: Record<string, unknown>,
    @GetUserData() user: UserData,
  ) {
    await this.lists.ownedByCode(code, await this.actor(user));
    return this.data.read(code, { show: 'all', ...query });
  }

  @Post('data/:code')
  async createRow(
    @Param('code') code: string,
    @Body() body: any,
    @GetUserData() user: UserData,
  ) {
    const actor = await this.actor(user);
    return this.data.create(
      await this.lists.ownedByCode(code, actor),
      body ?? {},
      actor.userId,
    );
  }

  @Post('data/:code/bulk')
  async createRows(
    @Param('code') code: string,
    @Body() body: any,
    @GetUserData() user: UserData,
  ) {
    const actor = await this.actor(user);
    return this.data.createBulk(
      await this.lists.ownedByCode(code, actor),
      body ?? {},
      actor.userId,
    );
  }

  @Patch('data/:code/:id')
  async updateRow(
    @Param('code') code: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @GetUserData() user: UserData,
  ) {
    const actor = await this.actor(user);
    return this.data.update(
      await this.lists.ownedByCode(code, actor),
      id,
      body ?? {},
      actor.userId,
    );
  }

  @Delete('data/:code/:id')
  async deactivateRow(
    @Param('code') code: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @GetUserData() user: UserData,
  ) {
    const actor = await this.actor(user);
    return this.data.deactivate(
      await this.lists.ownedByCode(code, actor),
      id,
      body ?? {},
      actor.userId,
    );
  }
}

/**
 * Public read endpoints of published lists, like every native list:
 * `GET api/control-lists`, `GET api/control-lists/{code}`,
 * `GET api/control-lists/{code}/get/{id}`. No owner: read-only.
 */
@ApiExcludeController()
@Controller()
@UseGuards(ControlListsEnabledGuard)
export class ControlListsPublicController {
  constructor(
    private readonly lists: ListsService,
    private readonly data: DataService,
  ) {}

  @Get()
  directory() {
    return this.lists.publicDirectory();
  }

  @Get(':code')
  read(@Param('code') code: string, @Query() query: Record<string, unknown>) {
    return this.data.read(code, query);
  }

  @Get(':code/get/:id')
  one(@Param('code') code: string, @Param('id', ParseIntPipe) id: number) {
    return this.data.one(code, id);
  }
}
