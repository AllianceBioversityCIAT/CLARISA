import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EndOfInitiativeOutcomeService } from './end-of-initiative-outcome.service';

@ApiTags('End of Initiative Outcome')
@Controller()
export class EndOfInitiativeOutcomeController {
  constructor(
    private readonly endOfInitiativeOutcomeService: EndOfInitiativeOutcomeService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List end of initiative outcomes',
    description: 'End-of-Initiative outcomes defined for the One CGIAR Initiatives.',
  })
  findAll() {
    return this.endOfInitiativeOutcomeService.findAll();
  }
}
