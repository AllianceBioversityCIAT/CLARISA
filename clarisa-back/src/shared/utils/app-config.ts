import { Injectable } from '@nestjs/common';
import { env } from 'process';

@Injectable()
export class AppConfig {
  get appPort() {
    return env.APP_PORT;
  }

  get appProfile() {
    return env.APP_PROFILE;
  }

  get dbPort() {
    return env.DB_PORT;
  }

  get dbHost() {
    return env.DB_HOST;
  }

  get dbName() {
    return env.DB_NAME;
  }

  get dbUser() {
    return env.DB_USER;
  }

  get dbPass() {
    return env.DB_PASS;
  }

  get jwtSecret() {
    return env.JWT_SECRET;
  }

  get jwtTime() {
    return env.JWT_TIME;
  }

  get bcryptSaltRounds() {
    return env.BCRYPT_SALT_ROUNDS;
  }

  get supportEmailParam() {
    return env.SUPPORT_EMAIL_PARAM;
  }

  get preferredEmailHost() {
    return env.PREFERRED_EMAIL_HOST;
  }

  get preferredEmailPort() {
    return env.PREFERRED_EMAIL_PORT;
  }

  get alternativeEmailHost() {
    return env.ALTERNATIVE_EMAIL_HOST;
  }

  get alternativeEmailPort() {
    return env.ALTERNATIVE_EMAIL_PORT;
  }

  get alternativeEmailUsername() {
    return env.ALTERNATIVE_EMAIL_USERNAME;
  }

  get alternativeEmailPassword() {
    return env.ALTERNATIVE_EMAIL_PASSWORD;
  }

  get ostUrl() {
    return env.OST_URL;
  }

  get ostUser() {
    return env.OST_USER;
  }

  get ostPass() {
    return env.OST_PASS;
  }

  get qaUrl() {
    return env.QA_URL;
  }

  get geonameUrl() {
    return env.GEONAME_URL;
  }

  get geonameUser() {
    return env.GEONAME_USER;
  }

  get tocUrl() {
    return env.TOC_URL;
  }

  get riskUrl() {
    return env.RISK_URL;
  }

  get reportingUrl() {
    return env.REPORTING_URL;
  }

  get mqHost() {
    return env.MQ_HOST;
  }

  get mqUser() {
    return env.MQ_USER;
  }

  get mqPassword() {
    return env.MQ_PASSWORD;
  }

  get opensearchUrl() {
    return env.OPENSEARCH_URL;
  }

  get opensearchDocumentName() {
    return env.OPENSEARCH_DOCUMENT_NAME;
  }

  get opensearchUsername() {
    return env.OPENSEARCH_USERNAME;
  }

  get opensearchPassword() {
    return env.OPENSEARCH_PASSWORD;
  }

  get msMessagingUser() {
    return env.MS_MESSAGING_USER;
  }

  get msMessagingPass() {
    return env.MS_MESSAGING_PASS;
  }

  get bccEmailsParam() {
    return env.BCC_EMAILS_PARAM;
  }

  get msMessagingQueue() {
    return env.MS_MESSAGING_QUEUE;
  }
}
