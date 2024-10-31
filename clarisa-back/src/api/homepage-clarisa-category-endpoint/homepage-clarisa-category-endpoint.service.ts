import { Injectable } from '@nestjs/common';
import { CategoryEndpointDto } from './dto/category-endpoints.dto';
import { HomepageClarisaCategoryEndpointRepository } from './repositories/homepage-clarisa-category-endpoint.repository';

@Injectable()
export class HomepageClarisaCategoryEndpointService {
  constructor(
    private _homepageClarisaCategoryEndpointRepository: HomepageClarisaCategoryEndpointRepository,
  ) {}

  async findAll(): Promise<CategoryEndpointDto[]> {
    return this._homepageClarisaCategoryEndpointRepository.getCategoryEndpoints();
  }
}
