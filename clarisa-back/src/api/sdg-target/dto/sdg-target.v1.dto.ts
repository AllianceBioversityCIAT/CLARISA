import { SdgV1Dto } from '../../sdg/dto/sdg.v1.dto';

export class SdgTargetV1Dto {
  id: number;
  sdgTargetCode: string;
  sdgTarget: string;
  sdg: SdgV1Dto;
}
