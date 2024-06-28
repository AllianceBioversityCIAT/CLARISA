import { Injectable } from '@nestjs/common';
import { Sdg } from '../entities/sdg.entity';
import { SdgV1Dto } from '../dto/sdg.v1.dto';
import { SdgV2Dto } from '../dto/sdg.v2.dto';
import { SimpleSdgV2Dto } from '../dto/simple-sdg.v2.dto';

@Injectable()
export class SdgMapper {
  classToDtoV1(sdg: Sdg): SdgV1Dto {
    const mappedSdg: SdgV1Dto = new SdgV1Dto();

    mappedSdg.financialCode = sdg.financial_code;
    mappedSdg.fullName = sdg.full_name;
    mappedSdg.shortName = sdg.short_name;
    mappedSdg.usndCode = sdg.smo_code;

    return mappedSdg;
  }

  classListToDtoV1List(sdgs: Sdg[]): SdgV1Dto[] {
    return sdgs.map((s) => this.classToDtoV1(s));
  }

  classToSimpleDtoV2(sdg: Sdg): SimpleSdgV2Dto {
    const mappedSdg: SimpleSdgV2Dto = new SimpleSdgV2Dto();

    mappedSdg.smo_code = sdg.smo_code;
    mappedSdg.financial_code = sdg.financial_code;
    mappedSdg.short_name = sdg.short_name;
    mappedSdg.full_name = sdg.full_name;

    return mappedSdg;
  }

  classToDtoV2(sdg: Sdg): SdgV2Dto {
    const mappedSdg: SdgV2Dto = new SdgV2Dto();

    mappedSdg.id = sdg.id;
    mappedSdg.smo_code = sdg.smo_code;
    mappedSdg.financial_code = sdg.financial_code;
    mappedSdg.short_name = sdg.short_name;
    mappedSdg.full_name = sdg.full_name;
    mappedSdg.icon = sdg.icon;
    mappedSdg.color = sdg.color;
    mappedSdg.description = sdg.description;

    return mappedSdg;
  }

  classListToDtoV2List(sdgs: Sdg[]): SdgV2Dto[] {
    return sdgs.map((s) => this.classToDtoV2(s));
  }
}
