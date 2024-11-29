import { DataSource, DataSourceOptions } from "typeorm";
import * as dotenv from "dotenv";
dotenv.config();
import { env } from "process";

/**
 * Database manager class
 */
export class Database {
  private static dataSource: DataSource;

  public static async getDataSource(): Promise<DataSource> {
    if (this.dataSource?.isInitialized) {
      console.log(`Database.getDataSource() - using existing data source...`);
      return this.dataSource;
    } else {
      console.log(`Database.getDataSource() - initializing data source...`);
      console.log(`Database.getConnection() - creating connection ...`);
      const dataSourceOptions: DataSourceOptions = {
        type: "mysql",
        host: env.DB_HOST,
        port: parseInt(env.DB_PORT),
        username: env.DB_USER_NAME,
        password: env.DB_USER_PASS,
        database: env.DB_NAME,
        entities: ["dist/entities/**/*.js"],
        synchronize: false,
        logging: false,
      };
      this.dataSource = new DataSource(dataSourceOptions);

      try {
        await this.dataSource.initialize();
        console.log("Data Source has been initialized!");
        return this.dataSource;
      } catch (error) {
        console.error("Error during Data Source initialization:", error);
        throw error;
      }
    }
  }
}
