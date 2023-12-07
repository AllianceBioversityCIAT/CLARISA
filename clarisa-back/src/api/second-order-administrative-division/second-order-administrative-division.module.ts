import { Module } from '@nestjs/common';
import { SecondOrderAdministrativeDivisionService } from './second-order-administrative-division.service';
import { SecondOrderAdministrativeDivisionController } from './second-order-administrative-division.controller';
import { HttpModule } from '@nestjs/axios';
import { ApiGeoNames } from '../../shared/integration/ost/api.geonames';

@Module({
  controllers: [SecondOrderAdministrativeDivisionController],
  imports: [HttpModule],
  providers: [
    SecondOrderAdministrativeDivisionService,
    HttpModule,
    ApiGeoNames,
  ],
})
export class SecondOrderAdministrativeDivisionModule {}
