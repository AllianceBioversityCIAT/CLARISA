import { Injectable } from '@nestjs/common';
import { SdgIndicator } from '../entities/sdg-indicator.entity';
import { SdgIndicatorV1Dto } from '../dto/sdg-indicator.v1.dto';
import { SdgIndicatorV2Dto } from '../dto/sdg-indicator.v2.dto';
import { SdgTargetMapper } from '../../sdg-target/mappers/sdg-target.mapper';

@Injectable()
export class SdgIndicatorMapper {
  constructor(private readonly _sdgTargetMapper: SdgTargetMapper) {}

  classToDtoV1(sdgIndicator: SdgIndicator): SdgIndicatorV1Dto {
    const mappedSdgIndicator: SdgIndicatorV1Dto = new SdgIndicatorV1Dto();

    mappedSdgIndicator.id = sdgIndicator.id;
    mappedSdgIndicator.indicatorCode = sdgIndicator.sdg_indicator_code;
    mappedSdgIndicator.indicatorName = sdgIndicator.sdg_indicator;
    mappedSdgIndicator.unsdIndicatorCode = sdgIndicator.unsd_indicator_code;

    if (sdgIndicator.sdg_target_object) {
      mappedSdgIndicator.sdgTarget = this._sdgTargetMapper.classToDtoV1(
        sdgIndicator.sdg_target_object,
      );
    }

    return mappedSdgIndicator;
  }

  classListToDtoV1List(sdgIndicators: SdgIndicator[]): SdgIndicatorV1Dto[] {
    return sdgIndicators.map((s) => this.classToDtoV1(s));
  }

  classToDtoV2(sdgIndicator: SdgIndicator): SdgIndicatorV2Dto {
    const mappedSdgIndicator: SdgIndicatorV2Dto = new SdgIndicatorV2Dto();

    mappedSdgIndicator.id = sdgIndicator.id;
    mappedSdgIndicator.indicator_code = sdgIndicator.sdg_indicator_code;
    mappedSdgIndicator.indicator_name = sdgIndicator.sdg_indicator;
    mappedSdgIndicator.unsd_indicator_code = sdgIndicator.unsd_indicator_code;

    if (sdgIndicator.sdg_target_object) {
      mappedSdgIndicator.sdg_target = this._sdgTargetMapper.classToDtoV2(
        sdgIndicator.sdg_target_object,
        true,
      );
    }

    return mappedSdgIndicator;
  }

  classListToDtoV2List(sdgIndicators: SdgIndicator[]): SdgIndicatorV2Dto[] {
    return sdgIndicators.map((s) => this.classToDtoV2(s));
  }
}
