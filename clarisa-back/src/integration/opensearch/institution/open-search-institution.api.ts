import { HttpService } from '@nestjs/axios';
import { BaseApi } from '../../base-api';
import { Injectable, Logger } from '@nestjs/common';
import { env } from 'process';
import { ElasticOperationDto } from '../dto/elastic-operation.dto';
import { forkJoin, lastValueFrom } from 'rxjs';
import { InstitutionRepository } from '../../../api/institution/repositories/institution.repository';
import { InstitutionDto } from '../../../api/institution/dto/institution.dto';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import {
  ElasticQueryDto,
  OpenSearchOperator,
  OpenSearchQuery,
  OpenSearchWildcard,
  TypeSort,
} from '../dto/elastic-query.dto';
import { ElasticResponse } from '../dto/elastic-response.dto';
import { AxiosRequestConfig, isAxiosError } from 'axios';
import { ArrayUtil } from '../../../shared/utils/array-util';

@Injectable()
export class OpenSearchInstitutionApi extends BaseApi {
  private readonly OPENSEARCH_MAX_UPLOAD_SIZE = 1024 * 1024; // 1MB
  private readonly _bulkElasticUrl = `_bulk`;
  private readonly _config: AxiosRequestConfig = {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.OPENSEARCH_USERNAME}:${env.OPENSEARCH_PASSWORD}`,
      ).toString('base64')}`,
      'Content-Type': 'application/x-ndjson',
    },
  };

  constructor(
    protected readonly httpService: HttpService,
    private readonly _institutionRepository: InstitutionRepository,
  ) {
    super();
    this.httpService = httpService;
    this.externalAppEndpoint = env.OPENSEARCH_URL;
    this.user = env.OPENSEARCH_USER;
    this.pass = env.OPENSEARCH_PASS;
    this.logger = new Logger(OpenSearchInstitutionApi.name);
  }

  public getSingleElasticOperation<T>(
    documentName: string,
    operation: ElasticOperationDto<T>,
    fromBulk = false,
  ): string {
    const isPatch: boolean = operation.operation === 'PATCH';
    let elasticOperation = `{ "${
      isPatch ? 'create' : 'delete'
    }" : { "_index" : "${documentName}", "_id" : "${operation.data['id']}"  } }
    ${isPatch ? JSON.stringify(operation.data) : ''}`;
    if (!fromBulk) {
      elasticOperation = elasticOperation.concat('\n');
    }

    return elasticOperation;
  }

  public getBulkElasticOperationForInstitutions(
    documentName: string,
    operations: ElasticOperationDto<InstitutionDto>[],
  ): string[] {
    const bulkElasticOperations = [];
    let currentBatchElasticOperations = '';
    let currentBatchElasticOperationSize = 0;
    const encoder = new TextEncoder();

    for (const [index, currentOperation] of operations.entries()) {
      const elasticOperation = this.getSingleElasticOperationForInstitutions(
        documentName,
        currentOperation,
        true,
      );

      /*
        we need to encode the operation string to get the accurrate
        byte size, as a simple string length will not work for
        multi-byte characters like emojis or special characters
        in other languages
      */
      const currentEncodedOperation = encoder.encode(elasticOperation);

      /*
        we will cut off the batch if we are at the last operation,
        or if the current operation is going to make the current batch
        larger than the max upload size
        (the +1 is an additional byte for the newline character,
        required by elastic search when bulk uploading)
       */
      if (
        currentBatchElasticOperationSize + currentEncodedOperation.length + 1 >
          this.OPENSEARCH_MAX_UPLOAD_SIZE ||
        (index === operations.length - 1 && currentBatchElasticOperations)
      ) {
        currentBatchElasticOperations =
          currentBatchElasticOperations.concat('\n');
        bulkElasticOperations.push(currentBatchElasticOperations);
        currentBatchElasticOperations = '';
        currentBatchElasticOperationSize = 0;
      }

      currentBatchElasticOperations += elasticOperation;
      currentBatchElasticOperationSize += currentEncodedOperation.length;
    }

    currentBatchElasticOperations = currentBatchElasticOperations.concat('\n');
    bulkElasticOperations.push(currentBatchElasticOperations);

    return bulkElasticOperations;
  }

  public getBulkElasticOperations<T>(
    documentName: string,
    operation: ElasticOperationDto<T>[],
  ): string {
    let bulkElasticOperations = '';

    operation.forEach(
      (o) =>
        (bulkElasticOperations += this.getSingleElasticOperation(
          documentName,
          o,
          true,
        )),
    );
    bulkElasticOperations = bulkElasticOperations.concat('\n');

    return bulkElasticOperations;
  }

  public getSingleElasticOperationForInstitutions(
    documentName: string,
    operation: ElasticOperationDto<InstitutionDto>,
    fromBulk = false,
  ): string {
    const isPatch: boolean = operation.operation === 'PATCH';

    let elasticOperation = `{ "${
      isPatch ? 'index' : 'delete'
    }" : { "_index" : "${documentName}", "_id" : "${
      operation.data.code
    }"  } }\n${isPatch ? JSON.stringify(operation.data) : ''}`;
    if (fromBulk) {
      elasticOperation = elasticOperation.concat('\n');
    }

    return elasticOperation;
  }

  /**
   * Sends bulk operations request to OpenSearch.
   *
   * This function performs the following steps:
   * 1. Converts the provided data into a format suitable for a bulk operation in OpenSearch.
   * 2. Sends the bulk operation request to the OpenSearch server.
   *
   * @param {string[]} bulkOperationsJson - An array of JSON strings representing the bulk operations to be performed.
   * @returns {Promise<any>} A promise that resolves with the response from the OpenSearch server.
   */
  public async sendBulkOperationToOpenSearch(
    bulkOperationsJson: string[],
  ): Promise<any> {
    const allRequests = bulkOperationsJson.map((op) =>
      this.postRequest(this._bulkElasticUrl, op, this._config),
    );

    return lastValueFrom(forkJoin(allRequests));
  }

  /**
   * Retrieves data from the institution repository and formats it for OpenSearch.
   *
   * This function performs the following steps:
   * 1. Queries the institution repository for institutions based on the provided options.
   * 2. Throws an error if no data is found.
   * 3. Maps the query results to an array of ElasticOperationDto objects.
   * 4. Converts the array of ElasticOperationDto objects to a bulk OpenSearch operation JSON format.
   *
   * @param {string} documentName - The name of the OpenSearch document.
   * @param {number} [ids] - An optional ID array to filter the institutions.
   * @returns {Promise<string[]>} A promise that resolves to an array of JSON strings representing the bulk OpenSearch operations.
   * @throws {Error} If no data is found in the repository.
   */
  async findForOpenSearch(
    documentName: string,
    ids?: number[],
  ): Promise<string[]> {
    return this._institutionRepository
      .findInstitutions(FindAllOptions.SHOW_ALL, undefined, ids)
      .then((queryResult) => {
        if (!queryResult.length) {
          throw new Error('No data found');
        }

        const operations: ElasticOperationDto<InstitutionDto>[] =
          queryResult.map((r) => new ElasticOperationDto('PATCH', r));

        const elasticJson: string[] =
          this.getBulkElasticOperationForInstitutions(documentName, operations);

        return elasticJson;
      });
  }

  /**
   * Resets the data in the OpenSearch index specified by `env.OPENSEARCH_DOCUMENT_NAME`.
   *
   * This function performs the following steps:
   * 1. Fetches all institutions from the system.
   * 2. Deletes the existing OpenSearch index.
   * 3. Recreates the index.
   * 4. Sends the previously retrieved data back to the newly created index.
   *
   * @returns {Promise<void>} A promise that resolves when the reset operation is complete.
   */
  async resetElasticData(): Promise<string | void> {
    const now = new Date();
    return this.findForOpenSearch(env.OPENSEARCH_DOCUMENT_NAME)
      .then((elasticData) =>
        lastValueFrom(
          this.deleteRequest(`${env.OPENSEARCH_DOCUMENT_NAME}`, this._config),
        ).then(() => elasticData),
      )
      .then((elasticData) =>
        lastValueFrom(
          this.putRequest(
            `${env.OPENSEARCH_DOCUMENT_NAME}`,
            null,
            this._config,
          ),
        ).then(() => elasticData),
      )
      .then((elasticData) => this.sendBulkOperationToOpenSearch(elasticData))
      .then(
        () =>
          `The data has been reset. Took ${new Date().getTime() - now.getTime()} ms`,
      )
      .catch((error) => {
        this.logger.error(error);
      });
  }

  async uploadInstitutionsToOpenSearch(
    institutions: number[] | InstitutionDto[],
  ): Promise<void> {
    const isNumericArray = ArrayUtil.isArrayOfType<number>(
      institutions,
      (e) => typeof e === 'number',
    );
    const promise = isNumericArray
      ? this.findForOpenSearch(env.OPENSEARCH_DOCUMENT_NAME, institutions)
      : Promise.resolve(
          this.getBulkElasticOperationForInstitutions(
            env.OPENSEARCH_DOCUMENT_NAME,
            institutions.map((i) => new ElasticOperationDto('PATCH', i)),
          ),
        );

    return promise
      .then((elasticData) => this.sendBulkOperationToOpenSearch(elasticData))
      .then(() => {
        this.logger.log(`The institutions have been uploaded to OpenSearch`);
      })
      .catch((error) => {
        this.logger.error(error);
      });
  }

  async uploadSingleInstitutionToOpenSearch(
    institution: number | InstitutionDto,
  ): Promise<void> {
    const isInstitutionId = typeof institution === 'number';
    const promise = isInstitutionId
      ? this.findForOpenSearch(env.OPENSEARCH_DOCUMENT_NAME, [institution])
      : Promise.resolve([
          this.getSingleElasticOperationForInstitutions(
            env.OPENSEARCH_DOCUMENT_NAME,
            new ElasticOperationDto('PATCH', institution),
          ),
        ]);

    return promise
      .then((elasticData) => this.sendBulkOperationToOpenSearch(elasticData))
      .then(() => {
        this.logger.log(
          `Institution with id ${isInstitutionId ? institution : institution.code} has been uploaded to OpenSearch`,
        );
      })
      .catch((error) => {
        this.logger.error(error);
      });
  }

  async search(
    query: string,
    size: number = 20,
  ): Promise<(InstitutionDto & { score: number })[]> {
    const elasticQuery = this._getElasticQuery<InstitutionDto>(
      query,
      size,
      ['name', 'acronym'],
      [{ code: { order: 'asc' } }],
    );

    return lastValueFrom(
      this.postRequest<
        ElasticQueryDto<InstitutionDto>,
        ElasticResponse<InstitutionDto>
      >(`${env.OPENSEARCH_DOCUMENT_NAME}/_search`, elasticQuery, this._config),
    )
      .then((response) => {
        return response.data?.hits?.hits?.map((hit) => ({
          ...hit._source,
          score: hit._score,
        }));
      })
      .catch((error: Error) => {
        const data = isAxiosError(error) ? error.response?.data : error.message;
        this.logger.error(data);
        throw new Error(data);
      });
  }

  /**
   * Generates an ElasticQueryDto based on the provided parameters.
   *
   * @template T - The type of the data to be queried.
   * @param {string} toFind - The string to search for.
   * @param {Array<keyof T>} fieldsToSearchOn - The fields to search on.
   * @param {Array<TypeSort<T>>} fieldsToSortOn - The fields to sort on.
   * @returns {ElasticQueryDto<T>} - The generated ElasticQueryDto.
   */
  private _getElasticQuery<T>(
    toFind: string,
    size: number,
    fieldsToSearchOn: (keyof T)[],
    fieldsToSortOn: TypeSort<T>[],
  ): ElasticQueryDto<T> {
    const query: ElasticQueryDto<T> = {
      size,
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    multi_match: {
                      query: toFind,
                      fields: fieldsToSearchOn as (keyof T)[],
                      operator: 'and',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      sort: [{ _score: { order: 'desc' } }, ...fieldsToSortOn],
    };
    const individualKeywords = toFind.split(/\s+/);

    const wildcardQueries = fieldsToSearchOn.flatMap((field) =>
      individualKeywords.map((keyword) => {
        const wildcardQuery: OpenSearchOperator<T> = {
          wildcard: {
            [field]: `*${keyword}*`,
          } as OpenSearchWildcard<T>,
        };
        return wildcardQuery;
      }),
    );

    //icky but necessary
    (query.query.bool.must[0] as OpenSearchQuery<T>).bool.should.push(
      ...wildcardQueries,
    );

    return query;
  }
}
