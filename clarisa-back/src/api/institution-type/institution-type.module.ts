import { Module } from '@nestjs/common';
import { InstitutionTypeService } from './institution-type.service';
import { InstitutionTypeController } from './institution-type.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionType } from './entities/institution-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InstitutionType])],
  controllers: [InstitutionTypeController],
  providers: [InstitutionTypeService],
})
export class InstitutionTypeModule {}
