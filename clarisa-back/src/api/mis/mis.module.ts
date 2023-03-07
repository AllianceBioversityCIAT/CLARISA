import { Module } from '@nestjs/common';
import { MisService } from './mis.service';
import { MisController } from './mis.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mis } from './entities/mis.entity';
import { MisRepository } from './repositories/mis.repository';

@Module({
  controllers: [MisController],
  providers: [MisService, MisRepository],
})
export class MisModule {}
