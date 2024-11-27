import {
  Controller,
  Get,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { HomepageClarisaCategoryEndpointService } from './homepage-clarisa-category-endpoint.service';
import { ApiExcludeController } from '@nestjs/swagger';

//@ClarisaPageOnly()
//@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
export class HomepageClarisaCategoryEndpointController {
  constructor(
    private readonly homepageClarisaCategoryEndpointService: HomepageClarisaCategoryEndpointService,
  ) {}

  @Get()
  findAll() {
    return this.homepageClarisaCategoryEndpointService.findAll();
  }
}
