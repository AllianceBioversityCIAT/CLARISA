import { Controller, Get, Redirect, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Administrative Scale')
@Controller()
export class AdministrativeScaleController {
  @Get('/')
  @ApiOperation({
    summary: 'List administrative scales',
    description:
      'Administrative scales used to classify the geographic reach of innovations (redirects to geographic-scopes?type=one-cgiar).',
  })
  @Redirect('geographic-scopes?type=one-cgiar', HttpStatus.MOVED_PERMANENTLY)
  getAll() {
    // nothing, we are just going to redirect
  }
}
