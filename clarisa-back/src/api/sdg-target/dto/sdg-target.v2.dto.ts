import { SimpleSdgV2Dto } from '../../sdg/dto/simple-sdg.v2.dto';

export class SdgTargetV2Dto {
  id: number;
  sdg_target_code: string;
  sdg_target: string;
  sdg: SimpleSdgV2Dto;
}
