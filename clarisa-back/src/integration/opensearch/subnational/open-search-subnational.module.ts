import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { OpenSearchSubnationalController } from './open-search-subnational.controller';
import { SubnationalScopeRepository } from '../../../api/subnational-scope/repositories/subnational-scope.repository';
import { OpenSearchSubnationalApi } from './open-search-subnational.api';

@Module({
  imports: [HttpModule],
  controllers: [OpenSearchSubnationalController],
  providers: [OpenSearchSubnationalApi, SubnationalScopeRepository],
})
export class OpenSearchSubnationalModule {}
