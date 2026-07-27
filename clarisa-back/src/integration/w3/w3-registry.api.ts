import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { AppConfig } from '../../shared/utils/app-config';
import { BaseApi } from '../base-api';
import { W3RegistryProjectsPageDto } from './dto/w3-registry-project.dto';

@Injectable()
export class W3RegistryApi extends BaseApi {
  constructor(
    protected readonly httpService: HttpService,
    private readonly appConfig: AppConfig,
  ) {
    super(httpService, appConfig.w3RegistryUrl, W3RegistryApi.name);
  }

  getPublishedProjects(
    page: number,
    limit: number,
  ): Observable<AxiosResponse<W3RegistryProjectsPageDto>> {
    return this.getRequest<W3RegistryProjectsPageDto>(
      `published/latest/projects?page=${page}&limit=${limit}`,
    );
  }
}
