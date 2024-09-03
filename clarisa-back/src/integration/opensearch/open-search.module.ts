import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenSearchController } from './open-search.controller';
import { OpenSearchInstitutionModule } from './institution/open-search-institution.module';

@Module({
  imports: [HttpModule, OpenSearchInstitutionModule],
  controllers: [OpenSearchController],
})
export class OpenSearchModule {}
