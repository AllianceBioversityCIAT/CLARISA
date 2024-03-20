import { StageDto } from './stage.dto';

export class InitiativeDto {
  /**
   * The initiative id
   */
  id: number;

  /**
   * The initiative name
   */
  name: string;

  /**
   * The initiative short name
   */
  short_name: string;

  /**
   * The initiative official code (smo_code?)
   */
  official_code: string;

  /**
   * The initiative status (is active?)
   */
  active: number;

  /**
   * The initiative status (Approved, Submitted, On hold, Editing, etc)
   */
  status: string;

  /**
   * The initiative <b>current</b> stage id
   */
  stageId: number;

  /**
   * The initiative <b>current</b> stage description
   */
  description: string;

  /**
   * The initiative action area id
   */
  action_area_id: number;

  /**
   * The initiative action area description
   */
  action_area_description: string;

  /**
   * All initiative stages
   */
  stages: StageDto[];

  /**
   * The initiative type id
   */
  type_id: number;
}
