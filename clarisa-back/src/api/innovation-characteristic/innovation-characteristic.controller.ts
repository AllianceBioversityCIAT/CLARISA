import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { InnovationCharacteristicService } from './innovation-characteristic.service';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InnovationCharacteristicDto } from './dto/innovation-characteristic.dto';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Innovation Characteristics')
export class InnovationCharacteristicController {
  constructor(
    private readonly innovationCharacteristicService: InnovationCharacteristicService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'show',
    enum: FindAllOptions,
    required: false,
    description:
      'Show active, inactive or all innovation characteristics. Defaults to active.',
  })
  @ApiOkResponse({ type: [InnovationCharacteristicDto] })
  async findAll(@Query('show') show: FindAllOptions) {
    return await this.innovationCharacteristicService.findAll(show);
  }

  @Get('get/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'The id of the innovation characteristic',
  })
  @ApiOkResponse({ type: [InnovationCharacteristicDto] })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.innovationCharacteristicService.findOne(id);
  }
}
