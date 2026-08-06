import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  ParseIntPipe,
  Res,
  Req,
  HttpStatus,
  HttpException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InstitutionService } from './institution.service';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UpdateInstitutionLifecycleDto } from './dto/update-institution-lifecycle.dto';
import { Request, Response } from 'express';
import { Institution } from './entities/institution.entity';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ValidityStatusOptions } from '../../shared/entities/enums/validity-status-options';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { UserData } from '../../shared/interfaces/user-data';

@ApiTags('Institution')
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  /**
   * `status` is optional and defaults to `all`, so a caller that does not send
   * it gets exactly the same response it gets today. It filters by value and
   * not by a boolean so a fourth state can be added later without breaking
   * anyone.
   */
  @Get()
  @ApiOperation({
    summary: 'List institutions',
    description:
      'Official list of institutions registered in CLARISA, including their type, acronym, country offices and headquarters.',
  })
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description: "Filter by status: 'all', 'active' (default) or 'inactive'.",
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Optional incremental cursor: only institutions with an ID greater than this value.',
  })
  async findAll(
    @Query('show') show: FindAllOptions,
    @Query('from', new ParseIntPipe({ optional: true }))
    from?: number,
    @Query('status') status?: ValidityStatusOptions,
  ) {
    return await this.institutionService.findAll(
      show,
      from,
      // `||` and not `??`: `?status=` with no value is an absent filter, not a
      // misspelled one, and several HTTP clients serialise an undefined query
      // parameter exactly like that. A misspelled value is still rejected in
      // the service.
      status || ValidityStatusOptions.SHOW_ALL,
    );
  }

  @Get('simple')
  async findAllSimple(@Query('show') show: FindAllOptions) {
    return await this.institutionService.findAllSimple(show);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionService.findOne(id);
  }

  @Get('simple/:id')
  async findOneSimple(@Param('id', ParseIntPipe) id: number) {
    return await this.institutionService.findOneSimple(id);
  }

  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateInstitutionDto[],
  ) {
    try {
      // The union is what this endpoint has always returned at runtime: the
      // body is not validated, so a caller may send a single object and
      // TypeORM answers with a single entity.
      const result: Institution | Institution[] =
        await this.institutionService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retire an institution and, optionally, link it to the one that replaces it.
   *
   * Deliberately a separate, guarded endpoint rather than extra keys on
   * `PATCH update`: deciding that an institution can no longer be reported
   * against affects every CGIAR system that consumes this catalogue, and must
   * not travel through the same unauthenticated bulk-edit door.
   */
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  // The id goes last on purpose. `PermissionGuard` authorises by checking
  // whether the requested path *contains* one of the user's permissions, and
  // every permission in the table is a literal route prefix
  // (`/api/institutions/create-bulk`, `/api/partner-requests/respond`). With
  // the id in the middle, `/api/institutions/221/lifecycle` matches no
  // permission that is not also dangerously broad: only `/api/institutions`
  // would work, and that would open every institution endpoint at once.
  // `/api/institutions/lifecycle/221` matches `/api/institutions/lifecycle`,
  // which grants exactly this endpoint and nothing else.
  @Patch('lifecycle/:id')
  async updateLifecycle(
    @Param('id', ParseIntPipe) id: number,
    @Body() lifecycleDto: UpdateInstitutionLifecycleDto,
    @Req() request: Request & { user?: UserData },
  ) {
    return await this.institutionService.updateLifecycle(
      id,
      lifecycleDto,
      request.user?.userId,
    );
  }
}
