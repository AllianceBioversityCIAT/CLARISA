import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  InnovationDevelopmentDto,
  InnovationUseDto,
  InnovationPackageDto,
  InnovationData,
} from './dto/taat-innovation.dto';
import {
  InnovationService,
  CombinedInnovationResponse,
} from './services/taat-innovation.service';

@ApiTags('Innovation')
@Controller('innovation')
export class InnovationController {
  private readonly logger = new Logger(InnovationController.name);

  constructor(private readonly innovationService: InnovationService) {}

  @Get('development')
  @ApiOperation({ summary: 'Get all Innovation Development results' })
  @ApiResponse({
    status: 200,
    description: 'Innovation Development data retrieved successfully',
    type: [InnovationDevelopmentDto],
  })
  async getInnovationDevelopment(): Promise<InnovationData[]> {
    try {
      this.logger.log('Fetching Innovation Development data');
      return await this.innovationService.getInnovationDevelopment();
    } catch (error) {
      this.logger.error('Error in getInnovationDevelopment:', error);
      throw new HttpException(
        'Failed to retrieve Innovation Development data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('use')
  @ApiOperation({ summary: 'Get all Innovation Use results' })
  @ApiResponse({
    status: 200,
    description: 'Innovation Use data retrieved successfully',
    type: [InnovationUseDto],
  })
  async getInnovationUse(): Promise<InnovationData[]> {
    try {
      this.logger.log('Fetching Innovation Use data');
      return await this.innovationService.getInnovationUse();
    } catch (error) {
      this.logger.error('Error in getInnovationUse:', error);
      throw new HttpException(
        'Failed to retrieve Innovation Use data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('package')
  @ApiOperation({ summary: 'Get all Innovation Package results' })
  @ApiResponse({
    status: 200,
    description: 'Innovation Package data retrieved successfully',
    type: [InnovationPackageDto],
  })
  async getInnovationPackage(): Promise<InnovationData[]> {
    try {
      this.logger.log('Fetching Innovation Package data');
      return await this.innovationService.getInnovationPackage();
    } catch (error) {
      this.logger.error('Error in getInnovationPackage:', error);
      throw new HttpException(
        'Failed to retrieve Innovation Package data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('all')
  @ApiOperation({
    summary: 'Get all innovations from the three types',
    description: 'Returns innovations grouped by type with counts',
  })
  @ApiResponse({
    status: 200,
    description: 'All innovations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        development: {
          type: 'array',
          items: { $ref: '#/components/schemas/InnovationDevelopmentDto' },
        },
        use: {
          type: 'array',
          items: { $ref: '#/components/schemas/InnovationUseDto' },
        },
        package: {
          type: 'array',
          items: { $ref: '#/components/schemas/InnovationPackageDto' },
        },
        total_count: {
          type: 'object',
          properties: {
            development: { type: 'number' },
            use: { type: 'number' },
            package: { type: 'number' },
            all: { type: 'number' },
          },
        },
      },
    },
  })
  async getAllInnovations(): Promise<CombinedInnovationResponse> {
    try {
      this.logger.log('Fetching all innovations');
      return await this.innovationService.getAllInnovations();
    } catch (error) {
      this.logger.error('Error in getAllInnovations:', error);
      throw new HttpException(
        'Failed to retrieve all innovations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('all/flat')
  @ApiOperation({
    summary: 'Get all innovations as flat array',
    description:
      'Returns all innovations in a single array with innovation_type field',
  })
  @ApiResponse({
    status: 200,
    description: 'All innovations retrieved as flat array',
    schema: {
      type: 'array',
      items: {
        allOf: [
          { $ref: '#/components/schemas/InnovationData' },
          {
            type: 'object',
            properties: {
              innovation_type: {
                type: 'string',
                enum: ['development', 'use', 'package'],
              },
            },
          },
        ],
      },
    },
  })
  async getAllInnovationsFlat(): Promise<
    (InnovationData & { innovation_type: string })[]
  > {
    try {
      this.logger.log('Fetching all innovations as flat array');
      return await this.innovationService.getAllInnovationsFlat();
    } catch (error) {
      this.logger.error('Error in getAllInnovationsFlat:', error);
      throw new HttpException(
        'Failed to retrieve all innovations as flat array',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('all/unified')
  @ApiOperation({
    summary: 'Get all innovations with unified SQL query',
    description: 'Most efficient endpoint - single SQL query with UNION ALL',
  })
  @ApiResponse({
    status: 200,
    description: 'All innovations retrieved with unified query',
    schema: {
      type: 'array',
      items: {
        allOf: [
          { $ref: '#/components/schemas/InnovationData' },
          {
            type: 'object',
            properties: {
              innovation_type: {
                type: 'string',
                enum: ['development', 'use', 'package'],
              },
            },
          },
        ],
      },
    },
  })
  async getAllInnovationsUnified(): Promise<
    (InnovationData & { innovation_type: string })[]
  > {
    try {
      this.logger.log('Fetching all innovations with unified query');
      return await this.innovationService.getAllInnovationsUnified();
    } catch (error) {
      this.logger.error('Error in getAllInnovationsUnified:', error);
      throw new HttpException(
        'Failed to retrieve all innovations with unified query',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
