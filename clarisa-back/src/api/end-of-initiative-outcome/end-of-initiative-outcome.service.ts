import { Injectable } from '@nestjs/common';
import { firstValueFrom, map } from 'rxjs';
import { OSTApi } from '../../integration/ost/ost.api';
import { InternalServerError } from '../../shared/errors/internal-server-error';

@Injectable()
export class EndOfInitiativeOutcomeService {
  constructor(private apiOst: OSTApi) {}

  async findAll() {
    return firstValueFrom(
      this.apiOst
        .getEndOfIniciative()
        .pipe(
          map(
            (response) => response?.data?.response?.eoi_outcome_by_initiatives,
          ),
        ),
    ).catch((error) => {
      throw new InternalServerError(
        'An error has occured while using the OST API.',
        error,
      );
    });
  }
}
