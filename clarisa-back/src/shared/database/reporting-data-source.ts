import { DataSource } from 'typeorm';
import 'dotenv/config';
import { env } from 'process';

export const reportingDataSource: DataSource = new DataSource({
  type: 'mysql',
  host: env.REPORTING_DB_HOST,
  port: parseInt(env.REPORTING_DB_PORT ?? '3306'),
  username: env.REPORTING_DB_USER,
  password: env.REPORTING_DB_PASS,
  database: env.REPORTING_DB_NAME,
  entities: [],
  synchronize: false,
  migrationsRun: false,
  logging: false,
  bigNumberStrings: false,
  extra: {
    namedPlaceholders: true,
  },
  name: 'reporting',
});
