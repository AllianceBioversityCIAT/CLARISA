import { DataSource, Repository } from 'typeorm';
import { HandlebarsTemplate } from '../entities/handlebars-template.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HandlebarsTemplateRepository extends Repository<HandlebarsTemplate> {
  constructor(private dataSource: DataSource) {
    super(HandlebarsTemplate, dataSource.createEntityManager());
  }
}
