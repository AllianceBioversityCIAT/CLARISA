import { SdgTargetV2Dto } from '../../sdg-target/dto/sdg-target.v2.dto';

export class SdgIndicatorV2Dto {
  id: number;
  unsd_indicator_code: string;
  indicator_code: string;
  indicator_name: string;
  sdg_target: SdgTargetV2Dto;
}
