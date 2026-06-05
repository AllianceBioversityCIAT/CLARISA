import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';
import { ValidateApiKeyDto } from './dto/validate-api-key.dto';
import { ValidateApiKeyResponseDto } from './dto/validate-api-key-response.dto';
import { ApiKeyValidateRateLimitGuard } from './guards/api-key-validate-rate-limit.guard';

@Controller()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ApiKeyValidateController {
  constructor(private readonly _apiKeyService: ApiKeyService) {}

  @Post('validate-api-key')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyValidateRateLimitGuard)
  async validateApiKey(
    @Body() validateApiKeyDto: ValidateApiKeyDto,
    @Req() request: Request,
  ): Promise<ValidateApiKeyResponseDto> {
    const clientIp = this._resolveClientIp(request);
    const result = await this._apiKeyService.validate(validateApiKeyDto, {
      clientIp,
      httpMethod: request.method,
      userAgent: request.headers['user-agent'] as string | undefined,
      recordUsage: true,
    });

    if (!result.valid) {
      throw new UnauthorizedException(result);
    }

    const { api_key_id, key_prefix, ...response } = result;
    return response;
  }

  private _resolveClientIp(request: Request): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? request.socket?.remoteAddress ?? undefined;
  }
}
