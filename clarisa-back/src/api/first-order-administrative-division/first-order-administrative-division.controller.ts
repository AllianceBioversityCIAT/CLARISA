import {
  Controller,
  Get,
  Param,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { FirstOrderAdministrativeDivisionService } from './first-order-administrative-division.service';
import { UseInterceptors } from '@nestjs/common/decorators';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { OrderAministrativeDivisionDto } from '../../shared/integration/ost/dto/order-administrative-division.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('First Order Administrative Divisions')
export class FirstOrderAdministrativeDivisionController {
  constructor(
    private readonly firstOrderAdministrativeDivisionService: FirstOrderAdministrativeDivisionService,
  ) {}

  @Get('iso-alpha-2/:isoAlpha2')
  @ApiParam({
    name: 'isoAlpha2',
    type: String,
    required: true,
    description: 'The ISO Alpha-2 of the country',
  })
  @ApiOkResponse({ type: [OrderAministrativeDivisionDto] })
  findAll(@Param('isoAlpha2') isoAlpha2: string) {
    return this.firstOrderAdministrativeDivisionService.findIsoAlpha2(
      isoAlpha2,
    );
  }
}
