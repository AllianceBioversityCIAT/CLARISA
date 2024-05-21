import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ApiOST } from '../../shared/integration/ost/api.ost';

@Injectable()
export class EndOfInitiativeOutcomeService {
  constructor(private apiOst: ApiOST) {}

  async findAll() {
    const response = await firstValueFrom(this.apiOst.getEndOfIniciative());

    const eois = response?.data?.response?.eoi_outcome_by_initiatives ?? [];

    return eois;
  }
}
