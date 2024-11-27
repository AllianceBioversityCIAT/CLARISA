import { Controller, Get, Param } from '@nestjs/common';
import { SecondOrderAdministrativeDivisionService } from './second-order-administrative-division.service';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller()
@ApiExcludeController()
export class SecondOrderAdministrativeDivisionController {
  constructor(
    private readonly secondOrderAdministrativeDivisionService: SecondOrderAdministrativeDivisionService,
  ) {}

  @Get('iso-alpha-2/:isoAlpha/admin-code-1/:adminCode')
  findAll(
    @Param('isoAlpha') isoAlpha = '',
    @Param('adminCode') adminCode = '',
  ) {
    return this.secondOrderAdministrativeDivisionService.findIsoAlpha2AdminCode(
      isoAlpha,
      adminCode,
    );
  }
}
