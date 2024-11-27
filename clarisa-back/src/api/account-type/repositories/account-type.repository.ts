import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { FindAllOptions } from '../../../shared/entities/enums/find-all-options';
import { AccountType } from '../entities/account-type.entity';

@Injectable()
export class AccountTypeRepository extends Repository<AccountType> {
  constructor(private dataSource: DataSource) {
    super(AccountType, dataSource.createEntityManager());
  }

  async findAllAccountTypes(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<AccountType[]> {
    let whereClause: FindOptionsWhere<AccountType> = {};
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        //do nothing. we will be showing everything, so no condition is needed;
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        whereClause = {
          auditableFields: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
          },
        };
        break;
    }

    return this.find({ where: whereClause });
  }
}
