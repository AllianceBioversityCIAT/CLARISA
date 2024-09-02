import { Injectable } from '@nestjs/common';
import { firstValueFrom, map } from 'rxjs';
import { ApiGeoNames } from '../../integration/geonames/geonames.api';

@Injectable()
export class FirstOrderAdministrativeDivisionService {
  constructor(private readonly geoNames: ApiGeoNames) {}

  async findIsoAlpha2(isoAlpha2: string) {
    return await firstValueFrom(
      this.geoNames.getFirstOrder(isoAlpha2).pipe(map((resp) => resp.data)),
    );
  }
}
