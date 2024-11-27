import { ApiProperty } from '@nestjs/swagger';

export class StageDto {
  @ApiProperty({
    description: 'The initiative by stage initiative id',
    minimum: 1,
    type: Number,
  })
  id: string;

  @ApiProperty({
    description: 'The initiative by stage id',
    minimum: 1,
    type: Number,
  })
  initvStgId: number;

  @ApiProperty({
    description: 'The initiative by stage stage id',
    minimum: 1,
    type: Number,
  })
  stageId: number;

  /**
   * The initiative by stage status (is active?)
   */
  @ApiProperty({
    description: 'Is the initiative by stage active?',
    type: Boolean,
  })
  active: number;
}
