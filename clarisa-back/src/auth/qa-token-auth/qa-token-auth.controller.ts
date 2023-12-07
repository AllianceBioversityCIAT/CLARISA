import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { QaTokenAuthService } from './qa-token-auth.service';
import { CreateQaTokenAuthDto } from './dto/create-qa-token-auth.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';

@Controller('qa-token-auth')
export class QaTokenAuthController {
  constructor(private readonly qaTokenAuthService: QaTokenAuthService) {}

  @Get()
  findAll() {
    return this.qaTokenAuthService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.qaTokenAuthService.findOne(+id);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  create(@Body() createQaTokenDto: CreateQaTokenAuthDto) {
    return this.qaTokenAuthService.create(createQaTokenDto);
  }
}
