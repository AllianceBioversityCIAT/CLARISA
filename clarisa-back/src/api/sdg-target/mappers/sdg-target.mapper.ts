import { Injectable } from '@nestjs/common';
import { SdgMapper } from '../../sdg/mappers/sdg.mapper';
import { SdgTargetV1Dto } from '../dto/sdg-target.v1.dto';
import { SdgTargetV2Dto } from '../dto/sdg-target.v2.dto';
import { SdgTarget } from '../entities/sdg-target.entity';

@Injectable()
export class SdgTargetMapper {
  constructor(private readonly _sdgMapper: SdgMapper) {}

  classToDtoV1(sdgTarget: SdgTarget): SdgTargetV1Dto {
    const mappedSdgTarget: SdgTargetV1Dto = new SdgTargetV1Dto();

    mappedSdgTarget.id = sdgTarget.id;
    mappedSdgTarget.sdgTarget = sdgTarget.sdg_target;
    mappedSdgTarget.sdgTargetCode = sdgTarget.sdg_target_code;

    if (sdgTarget.sdg_object) {
      mappedSdgTarget.sdg = this._sdgMapper.classToDtoV1(sdgTarget.sdg_object);
    }

    return mappedSdgTarget;
  }

  classListToDtoV1List(sdgTargets: SdgTarget[]): SdgTargetV1Dto[] {
    return sdgTargets.map((s) => this.classToDtoV1(s));
  }

  classToDtoV2(
    sdgTarget: SdgTarget,
    simpleSdg: boolean = false,
  ): SdgTargetV2Dto {
    const mappedSdgTarget: SdgTargetV2Dto = new SdgTargetV2Dto();

    mappedSdgTarget.id = sdgTarget.id;
    mappedSdgTarget.sdg_target = sdgTarget.sdg_target;
    mappedSdgTarget.sdg_target_code = sdgTarget.sdg_target_code;

    if (sdgTarget.sdg_object) {
      mappedSdgTarget.sdg = simpleSdg
        ? this._sdgMapper.classToDtoV2(sdgTarget.sdg_object)
        : this._sdgMapper.classToSimpleDtoV2(sdgTarget.sdg_object);
    }

    return mappedSdgTarget;
  }

  classListToDtoV2List(sdgTargets: SdgTarget[]): SdgTargetV2Dto[] {
    return sdgTargets.map((s) => this.classToDtoV2(s));
  }
}
