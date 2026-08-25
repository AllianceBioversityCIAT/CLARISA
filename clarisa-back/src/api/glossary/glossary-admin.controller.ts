import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { GlossaryAdminService } from './glossary-admin.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { UserData } from '../../shared/interfaces/user-data';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  CreateGlossaryTermDto,
  GlossaryAdminDto,
  GlossaryBulkDto,
  GlossaryBulkResultDto,
  UpdateGlossaryStatusDto,
  UpdateGlossaryTermDto,
} from './dto/glossary-admin.dto';

/**
 * Admin-only surface of the glossary, consumed by the CLARISA panel.
 *
 * Mounted under `api/glossary/admin` (see `api.routes.ts`), so the public
 * `GET api/glossary` contract that PRMS/MEL/MARLO consume stays untouched.
 * Excluded from the OpenAPI document: CLARISA only publishes read-only
 * control lists.
 */
@ApiExcludeController()
@Controller('admin')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class GlossaryAdminController {
  constructor(private readonly _glossaryAdminService: GlossaryAdminService) {}

  @Get('terms')
  findAll(@Query('show') show: FindAllOptions): Promise<GlossaryAdminDto[]> {
    return this._glossaryAdminService.findAllForAdmin(
      show ?? FindAllOptions.SHOW_ALL,
    );
  }

  @Get('terms/:id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<GlossaryAdminDto> {
    return this._glossaryAdminService.findOneForAdmin(id);
  }

  @Post('terms')
  create(
    @Body() createGlossaryTermDto: CreateGlossaryTermDto,
    @GetUserData() userData: UserData,
  ): Promise<GlossaryAdminDto> {
    return this._glossaryAdminService.create(createGlossaryTermDto, userData);
  }

  @Patch('terms/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGlossaryTermDto: UpdateGlossaryTermDto,
    @GetUserData() userData: UserData,
  ): Promise<GlossaryAdminDto> {
    return this._glossaryAdminService.update(
      id,
      updateGlossaryTermDto,
      userData,
    );
  }

  @Patch('terms/:id/status')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGlossaryStatusDto: UpdateGlossaryStatusDto,
    @GetUserData() userData: UserData,
  ): Promise<GlossaryAdminDto> {
    return this._glossaryAdminService.setStatus(
      id,
      updateGlossaryStatusDto.is_active,
      userData,
    );
  }

  /** Dry run: reports what a bulk load would do without writing anything. */
  @Post('bulk/preview')
  bulkPreview(
    @Body() glossaryBulkDto: GlossaryBulkDto,
  ): Promise<GlossaryBulkResultDto> {
    return this._glossaryAdminService.bulkPreview(glossaryBulkDto);
  }

  @Post('bulk/import')
  bulkImport(
    @Body() glossaryBulkDto: GlossaryBulkDto,
    @GetUserData() userData: UserData,
  ): Promise<GlossaryBulkResultDto> {
    return this._glossaryAdminService.bulkImport(glossaryBulkDto, userData);
  }
}
