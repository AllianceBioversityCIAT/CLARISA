import { NestFactory } from '@nestjs/core';
import * as bodyparser from 'body-parser';
import { AppModule } from './app.module';
import { dataSource } from './ormconfig';
import { env } from 'process';
import 'dotenv/config';
import { Logger, VersioningType } from '@nestjs/common';
import { versionExtractor } from './shared/interfaces/version-extractor';

async function bootstrap(): Promise<void> {
  const logger: Logger = new Logger('MainApp');
  const defaultPort = '3000';

  const app = await NestFactory.create(AppModule);
  app.enableVersioning({
    type: VersioningType.CUSTOM,
    extractor: versionExtractor,
  });
  logger.log(app.getHttpServer());
  app.use(bodyparser.urlencoded({ limit: '100mb', extended: true }));
  app.use(bodyparser.json({ limit: '100mb' }));
  app.enableCors();

  await dataSource
    .initialize()
    .then(() => {
      logger.log('Data Source has been initialized!');
    })
    .catch((err: unknown) => {
      logger.error('Error during Data Source initialization', err);
    });

  const currentPort = env.APP_PORT ?? defaultPort;
  await app.listen(currentPort);
  logger.log(
    `Our server is running on port ${currentPort} - Please go to "http://localhost:${currentPort}/" to access the application`,
  );

  /*TODO now that he know how to extract all the routes in the app
    dynamically, we would need to update the "permissions" table
    to have the most updated list of available endpoints
  */
  /*const server = app.getHttpServer();
  const router = server._events.request._router;

  const availableRoutes: [] = router.stack
    .map((layer) => {
      if (layer.route) {
        return {
          route: {
            path: layer.route?.path,
            method: layer.route?.stack[0].method,
          },
        };
      }
    })
    .filter((item) => item !== undefined);*/
}

void bootstrap();
