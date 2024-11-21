import { AxiosRequestConfig, isAxiosError } from 'axios';
import { BaseApi } from '../base-api';
import { HttpService } from '@nestjs/axios';
import { AppConfig } from '../../shared/utils/app-config';
import {
  ElasticQueryDto,
  OpenSearchOperator,
  OpenSearchQuery,
  OpenSearchWildcard,
  TypeSort,
} from './dto/elastic-query.dto';
import { Repository } from 'typeorm';
import { ElasticResponse } from './dto/elastic-response.dto';
import { forkJoin, lastValueFrom } from 'rxjs';
import { ElasticFindEntity } from './dto/elastic-find-entity.dto';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { ElasticOperationDto } from './dto/elastic-operation.dto';
import { ArrayUtil } from '../../shared/utils/array-util';

export abstract class BaseOpenSearchApi<
  Entity,
  OpenSearchEntity,
  Repo extends Repository<Entity> & ElasticFindEntity<OpenSearchEntity>,
> extends BaseApi {
  protected readonly OPENSEARCH_MAX_UPLOAD_SIZE = 1024 * 1024;
  protected readonly _bulkElasticUrl = `_bulk`;
  protected readonly _primaryKey: keyof Entity;
  protected readonly _index: string;
  protected _config: AxiosRequestConfig;
  constructor(
    protected readonly httpService: HttpService,
    protected readonly _mainRepo: Repo,
    protected readonly _appConfig: AppConfig,
    customPrimaryKey?: string,
  ) {
    super(
      httpService,
      _appConfig.opensearchUrl,
      BaseOpenSearchApi.name,
      _appConfig.opensearchUsername,
      _appConfig.opensearchPassword,
    );
    this._config = <Readonly<AxiosRequestConfig>>{
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${_appConfig.opensearchUsername}:${_appConfig.opensearchPassword}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-ndjson',
      },
    };
    if (customPrimaryKey) {
      this._primaryKey = customPrimaryKey as keyof Entity;
    } else {
      this._primaryKey = this._mainRepo.metadata.primaryColumns[0]
        .propertyName as keyof Entity;
    }
    this._index = `${this._appConfig.opensearchDocumentName}_${this._mainRepo.metadata.tableName}`;
  }

  async uploadSingleToOpenSearch(
    data: number | OpenSearchEntity,
  ): Promise<void> {
    const isInstitutionId = typeof data === 'number';
    const promise = isInstitutionId
      ? this.findForOpenSearch(this._appConfig.opensearchDocumentName, [data])
      : Promise.resolve([
          this.getSingleElasticOperation(
            this._index,
            new ElasticOperationDto('PATCH', data),
          ),
        ]);

    return promise
      .then((elasticData) => this.sendBulkOperationToOpenSearch(elasticData))
      .then(() => {
        this.logger.log(
          `Institution with id ${isInstitutionId ? data : data[this._primaryKey as string]} has been uploaded to OpenSearch`,
        );
      })
      .catch((error) => {
        this.logger.error(error);
      });
  }

  async uploadInstitutionsToOpenSearch(
    data: number[] | OpenSearchEntity[],
  ): Promise<void> {
    const isNumericArray = ArrayUtil.isArrayOfType<number>(
      data,
      (e) => typeof e === 'number',
    );
    const promise = isNumericArray
      ? this.findForOpenSearch(this._index, data)
      : Promise.resolve(
          this.getBulkElasticOperationForInstitutions(
            this._index,
            data.map((i) => new ElasticOperationDto('PATCH', i)),
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

  public getSingleElasticOperation(
    documentName: string,
    operation: ElasticOperationDto<OpenSearchEntity>,
    fromBulk = false,
  ): string {
    const isPatch: boolean = operation.operation === 'PATCH';

    let elasticOperation = `{ "${
      isPatch ? 'index' : 'delete'
    }" : { "_index" : "${documentName}", "_id" : "${
      operation.data[this._primaryKey as string]
    }"  } }\n${isPatch ? JSON.stringify(operation.data) : ''}`;
    if (fromBulk) {
      elasticOperation = elasticOperation.concat('\n');
    }

    return elasticOperation;
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
    return this.findForOpenSearch(this._index)
      .then((elasticData) =>
        lastValueFrom(this.deleteRequest(`${this._index}`, this._config)).then(
          () => elasticData,
        ),
      )
      .then((elasticData) =>
        lastValueFrom(
          this.putRequest(`${this._index}`, null, this._config),
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

  public getBulkElasticOperationForInstitutions(
    documentName: string,
    operations: ElasticOperationDto<OpenSearchEntity>[],
  ): string[] {
    const bulkElasticOperations = [];
    let currentBatchElasticOperations = '';
    let currentBatchElasticOperationSize = 0;
    const encoder = new TextEncoder();

    for (const [index, currentOperation] of operations.entries()) {
      const elasticOperation = this.getSingleElasticOperation(
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
    return this._mainRepo
      .findDataForOpenSearch(FindAllOptions.SHOW_ALL, ids)
      .then((queryResult) => {
        if (!queryResult.length) {
          throw new Error('No data found');
        }

        const operations: ElasticOperationDto<OpenSearchEntity>[] =
          queryResult.map((r) => new ElasticOperationDto('PATCH', r));

        const elasticJson: string[] =
          this.getBulkElasticOperationForInstitutions(documentName, operations);

        return elasticJson;
      });
  }

  async search(
    query: string,
    fieldsToSearchOn: (keyof OpenSearchEntity)[],
    fieldsToSortOn: TypeSort<OpenSearchEntity>[],
    size: number = 20,
  ): Promise<(OpenSearchEntity & { score: number })[]> {
    const elasticQuery = this._getElasticQuery<OpenSearchEntity>(
      query,
      size,
      fieldsToSearchOn,
      fieldsToSortOn,
    );

    return lastValueFrom(
      this.postRequest<
        ElasticQueryDto<OpenSearchEntity>,
        ElasticResponse<OpenSearchEntity>
      >(`${this._index}/_search`, elasticQuery, this._config),
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
  protected _getElasticQuery<T>(
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
