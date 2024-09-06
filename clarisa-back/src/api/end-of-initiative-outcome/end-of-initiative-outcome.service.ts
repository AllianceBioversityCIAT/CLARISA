import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { OSTApi } from '../../integration/ost/ost.api';

@Injectable()
export class EndOfInitiativeOutcomeService {
  constructor(private apiOst: OSTApi) {}

  async findAll() {
    const response = await firstValueFrom(this.apiOst.getEndOfIniciative());

    const eois = response.data.response.eoi_outcome_by_initiatives ?? [];

    return eois;
  }
}
