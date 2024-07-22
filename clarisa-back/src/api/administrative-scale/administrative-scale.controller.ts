import { Controller, Get, Redirect, HttpStatus } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller()
@ApiExcludeController()
export class AdministrativeScaleController {
  @Get('/')
  @Redirect('geographic-scopes?type=one-cgiar', HttpStatus.MOVED_PERMANENTLY)
  getAll() {
    // nothing, we are just going to redirect
  }
}
