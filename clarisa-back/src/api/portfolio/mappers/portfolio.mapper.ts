import { Injectable } from '@nestjs/common';
import { Portfolio } from '../entities/portfolio.entity';
import { PortfolioDto } from '../dto/portfolio.dto';

@Injectable()
export class PortfolioMapper {
  public classToDto(
    portfolio: Portfolio,
    showIsActive: boolean = false,
  ): PortfolioDto {
    const portfolioDto: PortfolioDto = new PortfolioDto();

    portfolioDto.code = portfolio.id;
    portfolioDto.name = portfolio.name;
    portfolioDto.start_date = portfolio.start_date?.getFullYear();
    portfolioDto.end_date = portfolio.end_date?.getFullYear();
    if (showIsActive) {
      portfolioDto.is_active = portfolio.auditableFields?.is_active;
    }

    return portfolioDto;
  }

  public classListToDtoList(
    portfolios: Portfolio[],
    showIsActive: boolean = false,
  ): PortfolioDto[] {
    return portfolios.map((portfolio) =>
      this.classToDto(portfolio, showIsActive),
    );
  }
}
