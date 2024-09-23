import { InitiativeStageOstDto } from './initiative-stage.ost.dto';

export class InitiativeOstDto {
  initvStgId: number;
  id: number;
  acronym: string;
  name: string;
  official_code: string;
  status: string;
  action_area_id: string;
  action_area_description: string;
  active: number;
  stageId: number;
  description: string;
  inInit: number;
  stages: InitiativeStageOstDto[];
}

export type InitiativeResponse = {
  initiatives: InitiativeOstDto[];
};
