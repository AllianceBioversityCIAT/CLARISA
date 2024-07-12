import { PartialType } from '@nestjs/mapped-types';
import { CreateMicroserviceMonitoringTestLinkDto } from './create-microservice-monitoring-test-link.dto';

export class UpdateMicroserviceMonitoringTestLinkDto extends PartialType(CreateMicroserviceMonitoringTestLinkDto) {}
