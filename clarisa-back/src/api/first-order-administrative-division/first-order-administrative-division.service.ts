import { Injectable } from '@nestjs/common';
import { ApiGeoNames } from '../../shared/integration/ost/api.geonames';
import { firstValueFrom, map } from 'rxjs';

@Injectable()
export class FirstOrderAdministrativeDivisionService {
  constructor(private readonly geoNames: ApiGeoNames) {}

  async findIsoAlpha2(isoAlpha2: string) {
    return await firstValueFrom(
      this.geoNames.getFirstOrder(isoAlpha2).pipe(map((resp) => resp.data)),
    );
  }
}
