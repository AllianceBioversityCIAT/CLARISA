import { SdgTargetV1Dto } from '../../sdg-target/dto/sdg-target.v1.dto';

export class SdgIndicatorV1Dto {
  id: number;
  unsdIndicatorCode: string;
  indicatorCode: string;
  indicatorName: string;
  sdgTarget: SdgTargetV1Dto;
}
