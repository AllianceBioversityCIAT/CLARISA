import { DataSource, Repository } from 'typeorm';
import { Center } from '../entities/center.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CenterRepository extends Repository<Center> {
  constructor(private dataSource: DataSource) {
    super(Center, dataSource.createEntityManager());
  }
}
