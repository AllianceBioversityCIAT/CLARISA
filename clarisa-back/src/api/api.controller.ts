import {
  Controller,
  Get,
  HttpStatus,
  Post,
  Body,
  UseGuards,
  Res,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../shared/guards/permission.guard';
import { ApiService } from './api.service';
import { QaTokenAuthService } from '../auth/qa-token-auth/qa-token-auth.service';
import { CreateQaTokenAuthDto } from '../auth/qa-token-auth/dto/create-qa-token-auth.dto';
import { format } from 'url';
import { Response } from 'express';

@Controller()
export class ApiController {
  constructor(
    private qaTokenAuthService: QaTokenAuthService,
    private readonly _apiService: ApiService,
  ) {}

  @Get()
  findAll() {
    return this._apiService.findAll();
  }

  @Get('cgiar-entity-types')
  getEntityTypes(@Res() res: Response, @Query() queryParams: any) {
    const urlObject = format({
      pathname: 'cgiar-entity-typology',
      query: queryParams,
    });

    // Perform the redirect
    return res.redirect(HttpStatus.MOVED_PERMANENTLY, urlObject);
  }

  @Post('qa-token')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  generateQaToken(@Body() createQaTokenDto: CreateQaTokenAuthDto) {
    return this.qaTokenAuthService.create(createQaTokenDto);
  }
}
