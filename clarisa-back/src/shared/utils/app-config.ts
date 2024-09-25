import { Injectable } from '@nestjs/common';
import { env } from 'process';

/**
 * The `AppConfig` class provides a centralized configuration management system
 * for accessing various environment variables used throughout the application.
 * Each getter method corresponds to a specific environment variable, allowing
 * for easy and organized access to configuration settings.
 *
 * @class AppConfig
 */
@Injectable()
export class AppConfig {
  /**
   *  appPort - The port on which the application runs.
   */
  get appPort() {
    return env.APP_PORT;
  }

  /**
   * appProfile - The profile of the application environment.
   */
  get appProfile() {
    return env.APP_PROFILE;
  }

  /**
   *  dbPort - The port number for the database connection.
   */
  get dbPort() {
    return env.DB_PORT;
  }

  /**
   *  dbHost - The host address for the database connection.
   */
  get dbHost() {
    return env.DB_HOST;
  }

  /**
   *  dbName - The name of the database.
   */
  get dbName() {
    return env.DB_NAME;
  }

  /**
   *  dbUser - The username for the database connection.
   */
  get dbUser() {
    return env.DB_USER;
  }

  /**
   *  dbPass - The password for the database connection.
   */
  get dbPass() {
    return env.DB_PASS;
  }

  /**
   *  jwtSecret - The secret key for JWT authentication.
   */
  get jwtSecret() {
    return env.JWT_SECRET;
  }

  /**
   *  jwtTime - The expiration time for JWT tokens.
   */
  get jwtTime() {
    return env.JWT_TIME;
  }

  /**
   *  bcryptSaltRounds - The number of salt rounds for bcrypt hashing.
   */
  get bcryptSaltRounds() {
    return env.BCRYPT_SALT_ROUNDS;
  }

  /**
   *  supportEmailParam - The support email parameter.
   */
  get supportEmailParam() {
    return env.SUPPORT_EMAIL_PARAM;
  }

  /**
   *  preferredEmailHost - The host address for the preferred email service.
   */
  get preferredEmailHost() {
    return env.PREFERRED_EMAIL_HOST;
  }

  /**
   *  preferredEmailPort - The port number for the preferred email service.
   */
  get preferredEmailPort() {
    return env.PREFERRED_EMAIL_PORT;
  }

  /**
   *  alternativeEmailHost - The host address for the alternative email service.
   */
  get alternativeEmailHost() {
    return env.ALTERNATIVE_EMAIL_HOST;
  }

  /**
   *  alternativeEmailPort - The port number for the alternative email service.
   */
  get alternativeEmailPort() {
    return env.ALTERNATIVE_EMAIL_PORT;
  }

  /**
   *  alternativeEmailUsername - The username for the alternative email service.
   */
  get alternativeEmailUsername() {
    return env.ALTERNATIVE_EMAIL_USERNAME;
  }

  /**
   *  alternativeEmailPassword - The password for the alternative email service.
   */
  get alternativeEmailPassword() {
    return env.ALTERNATIVE_EMAIL_PASSWORD;
  }

  /**
   *  ostUrl - The URL for the OST service.
   */
  get ostUrl() {
    return env.OST_URL;
  }

  /**
   *  ostUser - The username for the OST service.
   */
  get ostUser() {
    return env.OST_USER;
  }

  /**
   *  ostPass - The password for the OST service.
   */
  get ostPass() {
    return env.OST_PASS;
  }

  /**
   *  qaUrl - The URL for the QA service.
   */
  get qaUrl() {
    return env.QA_URL;
  }

  /**
   *  geonameUrl - The URL for the Geoname service.
   */
  get geonameUrl() {
    return env.GEONAME_URL;
  }

  /**
   *  geonameUser - The username for the Geoname service.
   */
  get geonameUser() {
    return env.GEONAME_USER;
  }

  /**
   *  tocUrl - The URL for the TOC service.
   */
  get tocUrl() {
    return env.TOC_URL;
  }

  /**
   *  riskUrl - The URL for the Risk service.
   */
  get riskUrl() {
    return env.RISK_URL;
  }

  /**
   *  reportingUrl - The URL for the Reporting service.
   */
  get reportingUrl() {
    return env.REPORTING_URL;
  }

  /**
   *  mqHost - The host address for the message queue service.
   */
  get mqHost() {
    return env.MQ_HOST;
  }

  /**
   *  mqUser - The username for the message queue service.
   */
  get mqUser() {
    return env.MQ_USER;
  }

  /**
   *  mqPassword - The password for the message queue service.
   */
  get mqPassword() {
    return env.MQ_PASSWORD;
  }

  /**
   *  opensearchUrl - The URL for the OpenSearch service.
   */
  get opensearchUrl() {
    return env.OPENSEARCH_URL;
  }

  /**
   *  opensearchDocumentName - The document name for the OpenSearch service.
   */
  get opensearchDocumentName() {
    return env.OPENSEARCH_DOCUMENT_NAME;
  }

  /**
   *  opensearchUsername - The username for the OpenSearch service.
   */
  get opensearchUsername() {
    return env.OPENSEARCH_USERNAME;
  }

  /**
   *  opensearchPassword - The password for the OpenSearch service.
   */
  get opensearchPassword() {
    return env.OPENSEARCH_PASSWORD;
  }

  /**
   *  msMessagingUser - The username for the MS Messaging service.
   */
  get msMessagingUser() {
    return env.MS_MESSAGING_USER;
  }

  /**
   *  msMessagingPass - The password for the MS Messaging service.
   */
  get msMessagingPass() {
    return env.MS_MESSAGING_PASS;
  }

  /**
   *  bccEmailsParam - The BCC emails parameter.
   */
  get bccEmailsParam() {
    return env.BCC_EMAILS_PARAM;
  }

  /**
   *  msMessagingQueue - The queue name for the MS Messaging service.
   */
  get msMessagingQueue() {
    return env.MS_MESSAGING_QUEUE;
  }
}
