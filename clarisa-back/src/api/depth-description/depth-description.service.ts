import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindAllOptions } from 'src/shared/entities/enums/find-all-options';
import { Repository } from 'typeorm';
import { UpdateDepthDescriptionDto } from './dto/update-depth-description.dto';
import { DepthDescription } from './entities/depth-description.entity';

@Injectable()
export class DepthDescriptionService {
  constructor(
    @InjectRepository(DepthDescription)
    private depthDescriptionRepository: Repository<DepthDescription>,
  ) {}

  async findAll(option : FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE) : Promise<DepthDescription[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.depthDescriptionRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.depthDescriptionRepository.find({
          where: {
            is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE
          }
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number) : Promise<DepthDescription> {
    return await this.depthDescriptionRepository.findOneBy({
      id,
      is_active : true
    });
  }

  async update(updateDepthDescriptionDto: UpdateDepthDescriptionDto[]) {
    return await this.depthDescriptionRepository.save(updateDepthDescriptionDto);
  }
}
