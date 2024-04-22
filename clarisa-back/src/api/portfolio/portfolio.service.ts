import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from './repositories/portfolio.repository';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Portfolio } from './entities/portfolio.entity';
import { PortfolioMapper } from './mappers/portfolio.mapper';
import { PortfolioDto } from './dto/portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(
    private _portfolioRepository: PortfolioRepository,
    private _portfolioMapper: PortfolioMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<PortfolioDto[]> {
    let portfolios: Portfolio[] = [];
    let showIsActive: boolean = true;

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        portfolios = await this._portfolioRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        showIsActive = option !== FindAllOptions.SHOW_ONLY_ACTIVE;
        portfolios = await this._portfolioRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw Error('?!');
    }

    return this._portfolioMapper.classListToDtoList(portfolios, showIsActive);
  }

  async findOne(id: number): Promise<PortfolioDto> {
    const portfolio: Portfolio = await this._portfolioRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });

    return portfolio ? this._portfolioMapper.classToDto(portfolio, true) : null;
  }
}
