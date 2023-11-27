import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Language } from './entities/language.entity';

@Injectable()
export class LanguageRepository extends Repository<Language> {
  constructor(private dataSource: DataSource) {
    super(Language, dataSource.createEntityManager());
  }
}
