import { Module } from '@nestjs/common';
import { FirstOrderAdministrativeDivisionService } from './first-order-administrative-division.service';
import { FirstOrderAdministrativeDivisionController } from './first-order-administrative-division.controller';
import { ApiGeoNames } from '../../shared/integration/ost/api.geonames';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [FirstOrderAdministrativeDivisionController],
  imports: [HttpModule],
  providers: [FirstOrderAdministrativeDivisionService, ApiGeoNames, HttpModule],
})
export class FirstOrderAdministrativeDivisionModule {}
