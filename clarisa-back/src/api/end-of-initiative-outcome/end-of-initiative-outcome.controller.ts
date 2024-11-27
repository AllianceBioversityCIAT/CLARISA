import { Controller, Get } from '@nestjs/common';
import { EndOfInitiativeOutcomeService } from './end-of-initiative-outcome.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InitiativeEoiOstDto } from '../../integration/ost/dto/eoi.ost.dto';

@Controller()
@ApiTags('End Of Initiative Outcomes')
export class EndOfInitiativeOutcomeController {
  constructor(
    private readonly endOfInitiativeOutcomeService: EndOfInitiativeOutcomeService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [InitiativeEoiOstDto] })
  @ApiOperation({
    summary: 'Get all end of initiative outcomes, directly from OST',
  })
  findAll() {
    return this.endOfInitiativeOutcomeService.findAll();
  }
}
