import { Injectable } from '@nestjs/common/decorators';
import { DataSource, Repository } from 'typeorm';
import { BiParameter } from '../entities/bi-parameter.entity';
import { ParametersBiUnit } from '../dto/parameter-unit-bi.dto';

@Injectable()
export class BiParameterRepository extends Repository<BiParameter> {
  constructor(private dataSource: DataSource) {
    super(BiParameter, dataSource.createEntityManager());
  }

  async getFindAllInformation() {
    return this.find().then((biParams) => {
      const parametersUnitsBi: ParametersBiUnit = new ParametersBiUnit();

      biParams.map((resp) => {
        parametersUnitsBi[resp.parameter_name] = resp.parameter_value;
      });

      return parametersUnitsBi;
    });
  }
}
