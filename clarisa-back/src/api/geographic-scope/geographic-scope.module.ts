import { Module } from '@nestjs/common';
import { GeographicScopeService } from './geographic-scope.service';
import { GeographicScopeController } from './geographic-scope.controller';
import { GeographicScopeRepository } from './repositories/geographic-scope.repository';
import { GeographicScopeMapper } from './mappers/geographic-scope.mapper';

@Module({
  controllers: [GeographicScopeController],
  providers: [
    GeographicScopeService,
    GeographicScopeRepository,
    GeographicScopeMapper,
  ],
})
export class GeographicScopeModule {}
