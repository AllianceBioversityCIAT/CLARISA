import { Inject, Injectable } from '@nestjs/common';
import { BaseMicroservice } from '../base-microservice';
import { EmailTemplate } from './dto/email-cases';
import { ConfigMessageDto, MessageDto } from './dto/message.dto';
import { HandlebarsCompiler } from '../../../shared/utils/handlebars-compiler';
import { PartnerRequest } from '../../../api/partner-request/entities/partner-request.entity';
import { Profile } from '../../../shared/entities/enums/profiles';
import { lastValueFrom } from 'rxjs';
import { AppConfig } from '../../../shared/utils/app-config';
import { User } from '../../../api/user/entities/user.entity';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { FileNotFoundError } from '../../../shared/errors/file-not-found.error';

@Injectable()
export class MessagingMicroservice extends BaseMicroservice {
  private readonly NEW_PARTNER_REQUEST_TEMPLATE_PATH =
    '../../../assets/email-templates/new-partner-request.hbs';
  private readonly RESPONDED_PARTNER_REQUEST_TEMPLATE_PATH =
    '../../../assets/email-templates/responded-partner-request.hbs';

  constructor(
    private handlebarsCompiler: HandlebarsCompiler,
    private appConfig: AppConfig,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {
    super(appConfig.msMessagingQueue, MessagingMicroservice.name);
  }

  private _sendMail(data: MessageDto) {
    return this._emit('send', data);
  }

  private async _getMessageMetadataForPR(
    partnerRequest: PartnerRequest,
    subject: string,
    templatePath: string,
    isRejected?: boolean,
  ): Promise<MessageDto> {
    const template = await this.handlebarsCompiler
      .compileTemplate(templatePath, partnerRequest)
      .catch((err) => {
        this.logger.error(
          `error reading template on path ${templatePath}. trace: ${err}`,
        );
        throw new FileNotFoundError(err);
      });

    const emailMetadata = new MessageDto();
    emailMetadata.auth = {
      username: this.appConfig.msMessagingUser,
      password: this.appConfig.msMessagingPass,
    };

    const currentEnv = Profile.getCurrentEnv();
    emailMetadata.data = new ConfigMessageDto();
    emailMetadata.data.from = {
      email: await this.cache.get(this.appConfig.supportEmailParam),
      name: 'CLARISA Support',
    };

    emailMetadata.data.emailBody = {
      subject: `${currentEnv.isDev ? 'TEST' : ''} ${subject}`,
      to: '',
      cc:
        partnerRequest.external_user_mail ??
        (partnerRequest.auditableFields.created_by_object as User).email,
      bcc: currentEnv.isProd
        ? await this.cache.get(this.appConfig.bccEmailsParam)
        : '',
      message: {
        text: template,
      },
    };

    if (isRejected !== undefined) {
      emailMetadata.data.emailBody.subject += isRejected
        ? ' REJECTED'
        : ' APPROVED';
    }

    return emailMetadata;
  }

  private async _getMessageMetadataForNewPR(
    partnerRequest: PartnerRequest,
  ): Promise<MessageDto> {
    const subject = `[CLARISA API - ${partnerRequest.mis_object.acronym}] Partner verification - ${partnerRequest.partner_name}`;
    return this._getMessageMetadataForPR(
      partnerRequest,
      subject,
      this.NEW_PARTNER_REQUEST_TEMPLATE_PATH,
    );
  }

  private async _getMessageMetadataForPRResponse(
    partnerRequest: PartnerRequest,
  ): Promise<MessageDto> {
    const isRejected = !!partnerRequest.rejected_by;
    const subject = `[CLARISA API - ${partnerRequest.mis_object.acronym}] Partner verification - ${partnerRequest.partner_name}`;
    return this._getMessageMetadataForPR(
      partnerRequest,
      subject,
      this.RESPONDED_PARTNER_REQUEST_TEMPLATE_PATH,
      isRejected,
    );
  }

  public async sendPartnerRequestEmail(
    emailCase: EmailTemplate,
    partnerRequest: PartnerRequest,
  ): Promise<any> {
    let emailMetadata: Promise<MessageDto>;
    switch (emailCase) {
      case EmailTemplate.PARTNER_REQUEST_INCOMING:
        emailMetadata = this._getMessageMetadataForNewPR(partnerRequest);
        break;
      case EmailTemplate.PARTNER_REQUEST_RESPONSE:
        emailMetadata = this._getMessageMetadataForPRResponse(partnerRequest);
        break;
      default:
        throw new Error('Email template not found');
    }

    return emailMetadata
      .then((metadata) =>
        lastValueFrom(this._sendMail(metadata))
          .then(() => this.logger.log('mail sent'))
          .catch((err) => {
            this.logger.error(err);
            throw new Error(err);
          }),
      )
      .catch((err) => {
        if (err instanceof FileNotFoundError) {
          // can't do anything
          return;
        }

        throw new Error(err);
      });
  }
}
