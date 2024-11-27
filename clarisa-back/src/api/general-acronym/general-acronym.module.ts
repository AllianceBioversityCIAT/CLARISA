import { Module } from '@nestjs/common';
import { GeneralAcronymService } from './general-acronym.service';
import { GeneralAcronymController } from './general-acronym.controller';
import { GeneralAcronymRepository } from './repositories/general-acronym.repository';
import { GeneralAcronymMapper } from './mappers/general-acronym.mapper';

@Module({
  controllers: [GeneralAcronymController],
  providers: [
    GeneralAcronymService,
    GeneralAcronymRepository,
    GeneralAcronymMapper,
  ],
})
export class GeneralAcronymModule {}
