import { Module } from '@nestjs/common';
import { FirstOrderAdministrativeDivisionService } from './first-order-administrative-division.service';
import { FirstOrderAdministrativeDivisionController } from './first-order-administrative-division.controller';
import { HttpModule } from '@nestjs/axios';
import { ApiGeoNames } from '../../integration/geonames/geonames.api';

@Module({
  controllers: [FirstOrderAdministrativeDivisionController],
  imports: [HttpModule],
  providers: [FirstOrderAdministrativeDivisionService, ApiGeoNames, HttpModule],
})
export class FirstOrderAdministrativeDivisionModule {}
