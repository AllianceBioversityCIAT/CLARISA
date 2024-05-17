import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';
import { env } from 'process';
import { Injectable, Logger } from '@nestjs/common';
import 'dotenv/config';
import Mail from 'nodemailer/lib/mailer';
import Handlebars from 'handlebars';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Profile } from '../entities/enums/profiles';
import { PartnerRequest } from '../../api/partner-request/entities/partner-request.entity';

@Injectable()
export class MailUtil {
  private readonly logger: Logger = new Logger(MailUtil.name);

  constructor() {
    Handlebars.registerHelper('current_year', () => new Date().getFullYear());
    Handlebars.registerHelper('support_email', () => env.SUPPORT_EMAIL);
  }

  private async getTransporterInstance(): Promise<
    nodemailer.Transporter<SMTPTransport.SentMessageInfo>
  > {
    const isProd: boolean = env.APP_PROFILE === 'PROD';
    // create reusable transporter object using the default SMTP transport
    let options: SMTPTransport.Options = {
      host: env.PREFERRED_EMAIL_HOST,
      port: env.PREFERRED_EMAIL_PORT as number | undefined,
      logger: isProd,
      debug: isProd,
      secure: false,
      ignoreTLS: true,
      tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false,
      },
    };

    // peferred option is prod, we need to send the auth credentials
    if (isProd) {
      options = {
        ...options,
        auth: {
          user: env.PREFERRED_EMAIL_USERNAME,
          pass: env.PREFERRED_EMAIL_PASSWORD,
        },
      };
    }

    let transporter = nodemailer.createTransport(options);

    let isReady: boolean = await transporter
      .verify()
      .then((res) => {
        this.logger.debug('Peferred mail connection established!');
        return res;
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `An error trying to establish a connection with the preferred mail connection was detected: ${String(err)}`,
        );
        return false;
      });

    if (!isReady) {
      this.logger.log(
        'could not init mail client with the preferred credentials. Switching to the alternative...',
      );

      options = {
        host: env.ALTERNATIVE_EMAIL_HOST,
        port: env.ALTERNATIVE_EMAIL_PORT as number | undefined,
        logger: isProd,
        debug: isProd,
        secure: false,
        ignoreTLS: true,
        tls: {
          // do not fail on invalid certs
          rejectUnauthorized: false,
        },
      };

      // if is not prod, the alternative option is the production one, so we need to pass the auth
      if (!isProd) {
        options = {
          ...options,
          auth: {
            user: env.ALTERNATIVE_EMAIL_USERNAME,
            pass: env.ALTERNATIVE_EMAIL_PASSWORD,
          },
        };
      }

      transporter = nodemailer.createTransport(options);

      isReady = await transporter
        .verify()
        .then((res) => {
          this.logger.debug('Alternative mail connection established!');
          return res;
        })
        .catch((err: unknown) => {
          this.logger.error(
            `An error trying to establish a connection with the alternative mail connection was detected: ${String(err)}`,
          );
          return false;
        });
    }

    if (isReady) {
      return transporter;
    } else {
      throw Error(
        'We were not able to establish a connection with the mail servers',
      );
    }
  }

  private loadUpTemplate(relativePath: string): Promise<string> {
    return fs.readFile(path.join(__dirname, relativePath), {
      encoding: 'utf-8',
    });
  }

  public sendNewPartnerRequestNotification(
    partnerRequest: Readonly<PartnerRequest>,
    //appContactPointMails: string[],
  ): void {
    const isDev: boolean = Profile.getfromName(env.APP_PROFILE) === Profile.DEV;
    const isProd: boolean =
      Profile.getfromName(env.APP_PROFILE) === Profile.PROD;

    const subject = `${isDev ? 'TEST' : ''} [CLARISA API - ${
      partnerRequest.mis_object.acronym
    }] Partner verification - ${partnerRequest.partner_name}`;

    //console.log('EMAIL', partnerRequest);
    const to: string[] = [];
    const cc: string[] = [
      partnerRequest.external_user_mail ??
        partnerRequest.auditableFields.created_by_object.email,
    ];
    let bcc: string[] = [];

    if (isProd) {
      //to.push(env.SUPPORT_EMAIL);
      bcc = [
        'j.d.munoz@cgiar.org',
        'g.martinez@cgiar.org',
        's.galvez@cgiar.org',
        'j.cadavid@cgiar.org',
        'h.f.tobon@cgiar.org',
        'Santiago.Sanchez@cgiar.org',
      ];
    }

    if (!isProd) {
      //bcc.push(...(appContactPointMails ?? []));
    }

    if (partnerRequest.external_user_mail) {
      //cc.push(partnerRequest.external_user_mail);
    }

    this.loadUpTemplate(
      '../../../assets/email-templates/new-partner-request.hbs',
    )
      .then((hbsTemplate) => {
        const template = Handlebars.compile(hbsTemplate);
        const compiledTemplate: string = template(partnerRequest);

        this.sendEmail({
          from: env.SUPPORT_EMAIL, // sender address
          to, // list of receivers
          cc,
          bcc,
          subject, // Subject line
          //text: 'Hello world?', // plain text body
          html: compiledTemplate, // html body
        }).catch((err) => {
          this.logger.error(err);
        });
      })
      .catch((err) => {
        this.logger.error(`The template could not be found...${err}`);
      });
  }

  public sendResponseToPartnerRequest(
    partnerRequest: PartnerRequest,
    //appContactPointMails: string[],
  ) {
    const isDev: boolean = Profile.getfromName(env.APP_PROFILE) == Profile.DEV;
    const isProd: boolean =
      Profile.getfromName(env.APP_PROFILE) == Profile.PROD;

    const subject = `${isDev ? 'TEST' : ''} [CLARISA API - ${
      partnerRequest.mis_object.acronym
    }] ${
      partnerRequest.rejected_by ? 'REJECTED' : 'APPROVED'
    } Partner verification - ${partnerRequest.partner_name}`;

    const to: string[] = [
      partnerRequest.external_user_mail ??
        partnerRequest.auditableFields.created_by_object.email,
    ];
    const cc: string[] = [];
    let bcc: string[] = [];

    if (isProd) {
      //to.push(env.SUPPORT_EMAIL);
      bcc = [
        'j.d.munoz@cgiar.org',
        'g.martinez@cgiar.org',
        's.galvez@cgiar.org',
        'j.cadavid@cgiar.org',
        'h.f.tobon@cgiar.org',
        'Santiago.Sanchez@cgiar.org',
      ];
    }

    if (!isProd) {
      //bcc.push(...(appContactPointMails ?? []));
    }

    this.loadUpTemplate(
      '../../../assets/email-templates/responded-partner-request.hbs',
    ).then((hbsTemplate) => {
      const template = Handlebars.compile(hbsTemplate);
      const compiledTemplate: string = template(partnerRequest);

      this.sendEmail({
        from: env.SUPPORT_EMAIL, // sender address
        to, // list of receivers
        cc,
        bcc,
        subject, // Subject line
        //text: 'Hello world?', // plain text body
        html: compiledTemplate, // html body
      });
    });
  }

  public async sendEmail(options: Mail.Options): Promise<any> {
    return this.getTransporterInstance()
      .then((transporter) => transporter.sendMail(options))
      .catch((err: unknown) => err);
  }
}
