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
} from '@nestjs/common';
import { UserService } from './user.service';
import { Response } from 'express';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(@Query('show') show: FindAllOptions) {
    return this.userService.findAll(show);
  }

  @Get('findByEmail/:email')
  async findByEmail(@Param('email') email: string) {
    return await this.userService.findOneByEmail(email);
  }

  @Get('findByUsername/:username')
  async findByUsername(@Param('username') username: string) {
    return await this.userService.findOneByUsername(username);
  }

  @Get('get/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.userService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Patch('update')
  async update(
    @Res() res: Response,
    @Body() updateUserDtoList: UpdateUserDto[],
  ) {
    try {
      const result: User[] = await this.userService.update(updateUserDtoList);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
