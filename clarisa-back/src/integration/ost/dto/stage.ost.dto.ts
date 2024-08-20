export class StageOstDto {
  id: number;
  description: string;
  active: number;
}

export type StageResponse = {
  stages: StageOstDto[];
};
