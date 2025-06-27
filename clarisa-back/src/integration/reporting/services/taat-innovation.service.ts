import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  InnovationResponseDto,
  InnovationData,
} from '../dto/taat-innovation.dto';

export interface CombinedInnovationResponse {
  development: InnovationData[];
  use: InnovationData[];
  package: InnovationData[];
  total_count: {
    development: number;
    use: number;
    package: number;
    all: number;
  };
}

@Injectable()
export class InnovationService {
  private readonly logger = new Logger(InnovationService.name);

  constructor(
    @InjectDataSource('reporting')
    private readonly reportingDataSource: DataSource,
  ) {}

  async getInnovationDevelopment(): Promise<InnovationData[]> {
    try {
      const query = `SELECT innovation_data FROM taat_innovation_development_view`;
      this.logger.log(`Executing Innovation Development query`);

      const results: InnovationResponseDto[] =
        await this.reportingDataSource.query(query);

      return results.map((row) => {
        if (typeof row.innovation_data === 'string') {
          return JSON.parse(row.innovation_data);
        }
        return row.innovation_data;
      });
    } catch (error) {
      this.logger.error('Error fetching innovation development data:', error);
      throw error;
    }
  }

  async getInnovationUse(): Promise<InnovationData[]> {
    try {
      const query = `SELECT innovation_data FROM taat_innovation_use_view`;
      this.logger.log(`Executing Innovation Use query`);

      const results: InnovationResponseDto[] =
        await this.reportingDataSource.query(query);

      return results.map((row) => {
        if (typeof row.innovation_data === 'string') {
          return JSON.parse(row.innovation_data);
        }
        return row.innovation_data;
      });
    } catch (error) {
      this.logger.error('Error fetching innovation use data:', error);
      throw error;
    }
  }

  async getInnovationPackage(): Promise<InnovationData[]> {
    try {
      const query = `SELECT innovation_data FROM taat_innovation_package_view`;
      this.logger.log(`Executing Innovation Package query`);

      const results: InnovationResponseDto[] =
        await this.reportingDataSource.query(query);

      return results.map((row) => {
        if (typeof row.innovation_data === 'string') {
          return JSON.parse(row.innovation_data);
        }
        return row.innovation_data;
      });
    } catch (error) {
      this.logger.error('Error fetching innovation package data:', error);
      throw error;
    }
  }

  async getAllInnovations(): Promise<CombinedInnovationResponse> {
    try {
      this.logger.log('Fetching all innovations from three views');

      const [development, use, packageData] = await Promise.all([
        this.getInnovationDevelopment(),
        this.getInnovationUse(),
        this.getInnovationPackage(),
      ]);

      const response: CombinedInnovationResponse = {
        development,
        use,
        package: packageData,
        total_count: {
          development: development.length,
          use: use.length,
          package: packageData.length,
          all: development.length + use.length + packageData.length,
        },
      };

      this.logger.log(
        `Retrieved ${response.total_count.all} total innovations`,
      );
      return response;
    } catch (error) {
      this.logger.error('Error fetching all innovations:', error);
      throw error;
    }
  }

  async getAllInnovationsFlat(): Promise<
    (InnovationData & { innovation_type: string })[]
  > {
    try {
      this.logger.log('Fetching all innovations as flat array');

      const [development, use, packageData] = await Promise.all([
        this.getInnovationDevelopment(),
        this.getInnovationUse(),
        this.getInnovationPackage(),
      ]);

      const allInnovations = [
        ...development.map((item) => ({
          ...item,
          innovation_type: 'development',
        })),
        ...use.map((item) => ({ ...item, innovation_type: 'use' })),
        ...packageData.map((item) => ({ ...item, innovation_type: 'package' })),
      ];

      this.logger.log(
        `Retrieved ${allInnovations.length} total innovations in flat array`,
      );
      return allInnovations;
    } catch (error) {
      this.logger.error('Error fetching all innovations flat:', error);
      throw error;
    }
  }

  async getAllInnovationsUnified(): Promise<
    (InnovationData & { innovation_type: string })[]
  > {
    try {
      this.logger.log('Executing unified query for all innovations');

      const unifiedQuery = `
        SELECT innovation_data, 'development' as innovation_type 
        FROM taat_innovation_development_view
        UNION ALL
        SELECT innovation_data, 'use' as innovation_type 
        FROM taat_innovation_use_view
        UNION ALL
        SELECT innovation_data, 'package' as innovation_type 
        FROM taat_innovation_package_view
      `;

      const results = await this.reportingDataSource.query(unifiedQuery);

      const allInnovations = results.map((row: any) => {
        const innovationData =
          typeof row.innovation_data === 'string'
            ? JSON.parse(row.innovation_data)
            : row.innovation_data;

        return {
          ...innovationData,
          innovation_type: row.innovation_type,
        };
      });

      this.logger.log(
        `Retrieved ${allInnovations.length} total innovations with unified query`,
      );
      return allInnovations;
    } catch (error) {
      this.logger.error(
        'Error fetching all innovations with unified query:',
        error,
      );
      throw error;
    }
  }
}
