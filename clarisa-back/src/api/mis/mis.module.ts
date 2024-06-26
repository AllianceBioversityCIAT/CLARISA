import { Module } from '@nestjs/common';
import { MisService } from './mis.service';
import { MisController } from './mis.controller';
import { MisRepository } from './repositories/mis.repository';

@Module({
  controllers: [MisController],
  providers: [MisService, MisRepository],
})
export class MisModule {}
