import { Module } from '@nestjs/common';
import { SubnationalScopeController } from './subnational-scope.controller';
import { SubnationalScopeService } from './subnational-scope.service';
import { SubnationalScopeRepository } from './repositories/subnational-scope.repository';

@Module({
  controllers: [SubnationalScopeController],
  providers: [SubnationalScopeService, SubnationalScopeRepository],
})
export class SubnationalScopeModule {}
