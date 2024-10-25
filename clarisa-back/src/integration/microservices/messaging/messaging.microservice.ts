import { Inject, Injectable } from '@nestjs/common';
import { BaseMicroservice } from '../base-microservice';
import { EmailTemplate } from './dto/email-cases';
import { ConfigMessageDto, MessageDto } from './dto/message.dto';
import { PartnerRequest } from '../../../api/partner-request/entities/partner-request.entity';
import { Profile } from '../../../shared/entities/enums/profiles';
import { lastValueFrom } from 'rxjs';
import { AppConfig } from '../../../shared/utils/app-config';
import { User } from '../../../api/user/entities/user.entity';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { HandlebarsTemplateService } from '../../../api/handlebars-template/handlebars-template.service';
import { HandlebarsCompiler } from '../../../shared/utils/handlebars-compiler';
import { BadParamsError } from '../../../shared/errors/bad-params.error';

/**
 * MessagingMicroservice handles the sending of emails from this application.
 * It extends the BaseMicroservice and utilizes Handlebars for email template compilation.
 *
 * @class MessagingMicroservice
 * @extends {BaseMicroservice}
 *
 */
@Injectable()
export class MessagingMicroservice extends BaseMicroservice {
  /**
   * @param _handlebarsTemplateService - The HandlebarsTemplateService to get the email templates.
   * @param _appConfig - The application configuration object.
   * @param cache - The cache manager instance injected via dependency injection.
   */
  constructor(
    private _appConfig: AppConfig,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private _handlebarsCompiler: HandlebarsCompiler,
    private _handlebarsTemplateService: HandlebarsTemplateService,
  ) {
    super(_appConfig.msMessagingQueue, MessagingMicroservice.name, _appConfig);
  }

  /**
   * Sends an email message by emitting a 'send' event with the provided data.
   *
   * @param data - The message data to be sent.
   * @returns A promise that resolves when the message has been emitted.
   */
  private _sendMail(data: MessageDto) {
    return this._emit('send', data);
  }

  /**
   * Generates the metadata for a message related to a Partner Request (PR).
   *
   * @param partnerRequest - The partner request object containing details about the request.
   * @param subject - The subject of the email.
   * @param templatePath - The file path to the email template.
   * @param isRejected - Optional flag indicating if the request was rejected.
   * @returns A promise that resolves to a MessageDto object containing the email metadata.
   * @throws FileNotFoundError - If there is an error reading the template file.
   */
  private async _getMessageMetadataForPR(
    partnerRequest: PartnerRequest,
    subject: string,
    templatePath: string,
    isRejected?: boolean,
  ): Promise<MessageDto> {
    const template = await this._handlebarsTemplateService
      .getAndUpdateTemplate(templatePath)
      .then((rawTemplate) => {
        return this._handlebarsCompiler.compileTemplate(
          rawTemplate,
          partnerRequest,
        );
      });

    const emailMetadata = new MessageDto();
    emailMetadata.auth = {
      username: this._appConfig.msMessagingUser,
      password: this._appConfig.msMessagingPass,
    };

    const currentEnv = Profile.getfromName(this._appConfig.appProfile);
    emailMetadata.data = new ConfigMessageDto();
    emailMetadata.data.from = {
      email: await this.cache.get(this._appConfig.supportEmailParam),
      name: 'CLARISA Support',
    };

    emailMetadata.data.emailBody = {
      subject: `${currentEnv.isDev ? 'TEST' : ''} ${subject}`,
      to: '',
      cc:
        partnerRequest.external_user_mail ??
        (partnerRequest.auditableFields.created_by_object as User).email,
      bcc: currentEnv.isProd
        ? await this.cache.get(this._appConfig.bccEmailsParam)
        : '',
      message: {
        socketFile: Buffer.from(template),
      },
    };

    if (isRejected !== undefined) {
      emailMetadata.data.emailBody.subject += isRejected
        ? ' REJECTED'
        : ' APPROVED';
    }

    return emailMetadata;
  }

  /**
   * Generates the message metadata for a new partner request.
   *
   * @param partnerRequest - The partner request object containing details about the partner.
   * @returns A promise that resolves to a MessageDto containing the message metadata.
   */
  private async _getMessageMetadataForNewPR(
    partnerRequest: PartnerRequest,
    templatePath: string,
  ): Promise<MessageDto> {
    const subject = `[CLARISA API - ${partnerRequest.mis_object.acronym}] Partner verification - ${partnerRequest.partner_name}`;
    return this._getMessageMetadataForPR(partnerRequest, subject, templatePath);
  }

  /**
   * Retrieves the message metadata for a partner request response.
   *
   * @param partnerRequest - The partner request object containing details about the request.
   * @returns A promise that resolves to a MessageDto containing the message metadata.
   */
  private async _getMessageMetadataForPRResponse(
    partnerRequest: PartnerRequest,
    templatePath: string,
  ): Promise<MessageDto> {
    const isRejected = !!partnerRequest.rejected_by;
    const subject = `[CLARISA API - ${partnerRequest.mis_object.acronym}] Partner verification - ${partnerRequest.partner_name}`;
    return this._getMessageMetadataForPR(
      partnerRequest,
      subject,
      templatePath,
      isRejected,
    );
  }

  /**
   * Sends an email based on the provided email template and partner request.
   *
   * @param emailCase - The template of the email to be sent.
   * @param partnerRequest - The partner request data used to generate the email content.
   * @returns A promise that resolves when the email is successfully sent.
   * @throws Will throw an error if the email template is not found or if there is an error sending the email.
   */
  public async sendPartnerRequestEmail(
    emailCase: EmailTemplate,
    partnerRequest: PartnerRequest,
  ): Promise<any> {
    let emailMetadata: Promise<MessageDto>;
    switch (emailCase) {
      case EmailTemplate.PARTNER_REQUEST_INCOMING:
        emailMetadata = this._getMessageMetadataForNewPR(
          partnerRequest,
          this._appConfig.newPrTemplateParam,
        );
        break;
      case EmailTemplate.PARTNER_REQUEST_RESPONSE:
        emailMetadata = this._getMessageMetadataForPRResponse(
          partnerRequest,
          this._appConfig.respondPrTemplateParam,
        );
        break;
      default:
        throw new Error('Email template not found');
    }

    return emailMetadata
      .then((metadata) =>
        lastValueFrom(this._sendMail(metadata))
          .then(() => {
            const recipients = `TO=${metadata.data.emailBody.to}; CC=${metadata.data.emailBody.cc}; BCC=${metadata.data.emailBody.bcc}`;
            this.logger.verbose(
              `mail sent to "${recipients}" with subject "${metadata.data.emailBody.subject}"`,
            );
          })
          .catch((err) => {
            this.logger.error(err);
            throw new Error(err);
          }),
      )
      .catch((err) => {
        if (err instanceof BadParamsError) {
          // can't do anything
          return;
        }

        throw new Error(err);
      });
  }
}
