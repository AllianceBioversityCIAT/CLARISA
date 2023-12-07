import {
  Controller,
  Get,
  Param,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { FirstOrderAdministrativeDivisionService } from './first-order-administrative-division.service';
import { UseInterceptors } from '@nestjs/common/decorators';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class FirstOrderAdministrativeDivisionController {
  constructor(
    private readonly firstOrderAdministrativeDivisionService: FirstOrderAdministrativeDivisionService,
  ) {}

  @Get('iso-alpha-2/:isoAlpha2')
  findAll(@Param('isoAlpha2') isoAlpha2: string) {
    return this.firstOrderAdministrativeDivisionService.findIsoAlpha2(
      isoAlpha2,
    );
  }
}
