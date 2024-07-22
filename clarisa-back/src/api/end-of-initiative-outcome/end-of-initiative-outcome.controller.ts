import { Controller, Get } from '@nestjs/common';
import { EndOfInitiativeOutcomeService } from './end-of-initiative-outcome.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { InitiativeEoiOstDto } from '../../shared/integration/ost/dto/eoi.ost.dto';

@Controller()
@ApiTags('End Of Initiative Outcomes')
export class EndOfInitiativeOutcomeController {
  constructor(
    private readonly endOfInitiativeOutcomeService: EndOfInitiativeOutcomeService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [InitiativeEoiOstDto] })
  findAll() {
    return this.endOfInitiativeOutcomeService.findAll();
  }
}
