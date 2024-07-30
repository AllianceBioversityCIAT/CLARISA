import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AppSecret } from '../entities/app-secret.entity';

@Injectable()
export class AppSecretRepository extends Repository<AppSecret> {
  constructor(private dataSource: DataSource) {
    super(AppSecret, dataSource.createEntityManager());
  }
}
