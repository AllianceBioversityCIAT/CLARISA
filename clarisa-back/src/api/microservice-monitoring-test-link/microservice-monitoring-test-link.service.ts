import { Injectable } from '@nestjs/common';
import { MicroserviceMonitoringTestLinkRepository } from './repositories/microservice-monitoring-test-link.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { MicroserviceMonitoringTestLinkDto } from './dto/microservice-monitoring-test-link.dto';

@Injectable()
export class MicroserviceMonitoringTestLinkService {
  constructor(
    private readonly _microserviceMonitoringTestLinkRepository: MicroserviceMonitoringTestLinkRepository,
  ) {}
  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<MicroserviceMonitoringTestLinkDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._microserviceMonitoringTestLinkRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._microserviceMonitoringTestLinkRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<MicroserviceMonitoringTestLinkDto> {
    return await this._microserviceMonitoringTestLinkRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }
}
