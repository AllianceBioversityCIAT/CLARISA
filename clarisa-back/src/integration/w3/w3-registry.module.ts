import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { W3RegistryApi } from './w3-registry.api';
import { W3RegistrySyncService } from './w3-registry-sync.service';

@Module({
  imports: [HttpModule],
  providers: [W3RegistryApi, W3RegistrySyncService],
  exports: [W3RegistrySyncService],
})
export class W3RegistryModule {}
