import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../shared/guards/permission.guard';
import { GetUserData } from '../../../shared/decorators/user-data.decorator';
import { UserData } from '../../../shared/interfaces/user-data';
import { GlobalConceptsEnabledGuard } from '../utils/feature-enabled.guard';
import { AssistantChatDto } from '../dto/assistant.dto';
import { ConceptAssistantService } from '../services/concept-assistant.service';
import { SchemeCode } from '../utils/scheme-code.decorator';

/**
 * Concept assistant (assistant-contract.md), mounted like the admin
 * controller. The paths sit under `admin/concepts-assist/...` on purpose:
 * PermissionGuard matches by substring, so the CONCEPTS_CE permission
 * `/api/meliaf-taxonomy/admin/concepts` opens them and nothing else.
 * Unlike the other AI routes (404 while AI is off), these answer 503 with a
 * human message, so the chat can say why it is unavailable.
 */
@ApiExcludeController()
@Controller('admin')
@UseGuards(GlobalConceptsEnabledGuard, JwtAuthGuard, PermissionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class GlobalConceptsAssistantController {
  constructor(private readonly assistant: ConceptAssistantService) {}

  @Get('concepts-assist/status')
  status() {
    return this.assistant.status();
  }

  @Post('concepts-assist/chat')
  @HttpCode(200)
  chat(
    @SchemeCode() scheme: string,
    @Body() dto: AssistantChatDto,
    @GetUserData() user: UserData,
  ) {
    return this.assistant.chat(
      scheme,
      dto,
      String(user?.userId ?? user?.email ?? 'anonymous'),
    );
  }
}
