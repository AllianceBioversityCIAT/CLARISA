import { Injectable } from '@nestjs/common';
import { ApiGeoNames } from '../../shared/integration/ost/api.geonames';
import { firstValueFrom, map } from 'rxjs';

@Injectable()
export class SecondOrderAdministrativeDivisionService {
  constructor(private readonly geoNames: ApiGeoNames) {}

  async findIsoAlpha2AdminCode(isoAlpha2: string, adminCode1: string) {
    return await firstValueFrom(
      this.geoNames
        .getSecondOrder(isoAlpha2, adminCode1)
        .pipe(map((resp) => resp.data)),
    );
  }
}
