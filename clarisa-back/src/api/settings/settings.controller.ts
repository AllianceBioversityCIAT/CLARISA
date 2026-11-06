import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { UserData } from '../../shared/interfaces/user-data';
import { SettingsService } from './settings.service';
import {
  ContentEditingState,
  UpdateContentEditingDto,
} from './dto/content-editing.dto';

/**
 * `api/settings`: parameters an administrator changes from the panel.
 * Reading the lock needs a session (the editing pages show it); changing it
 * needs the `/api/settings` permission (Super admin).
 */
@ApiExcludeController()
@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('content-editing')
  @UseGuards(JwtAuthGuard)
  contentEditing(): Promise<ContentEditingState> {
    return this.settings.contentEditing();
  }

  @Patch('content-editing')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  setContentEditing(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: UpdateContentEditingDto,
    @GetUserData() user: UserData,
  ): Promise<ContentEditingState> {
    return this.settings.setContentEditing(dto.locked, user?.email ?? null);
  }
}
