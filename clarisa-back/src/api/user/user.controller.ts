import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  HttpException,
  HttpStatus,
  Res,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Response } from 'express';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { PaginationParamsDto } from '../../shared/entities/dtos/pagination-params.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { ApiExcludeController } from '@nestjs/swagger';
import { UserDataDto } from '../../shared/entities/dtos/user-data.dto';
import { GetUserData } from '../../shared/decorators/user-data.decorator';
import { CreateUserDto } from './dto/create-user.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
//TODO determine if all routes need to be protected by JwtAuthGuard and PermissionGuard
export class UserController {
  constructor(private readonly _userService: UserService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  create(
    @GetUserData() userData: UserDataDto,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this._userService.create(userData, createUserDto);
  }

  @Get()
  findAll(@Query('show') show: FindAllOptions) {
    return this._userService.findAll(show);
  }

  @Get('findByEmail/:email')
  async findByEmail(@Param('email') email: string) {
    return await this._userService.findOneByEmail(email);
  }

  @Get('findByUsername/:username')
  async findByUsername(@Param('username') username: string) {
    return await this._userService.findOneByUsername(username);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this._userService.findOne(id);
  }

  @Get('search')
  async getUsersPagination(@Query() { offset, limit }: PaginationParamsDto) {
    return this._userService.getUsersPagination(offset, limit);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateUserDto[],
  ) {
    try {
      const result: User[] = await this._userService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
