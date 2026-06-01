import { NestFactory } from '@nestjs/core';
import * as bodyparser from 'body-parser';
import { AppModule } from './app.module';
import { dataSource } from './ormconfig';
import 'dotenv/config';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { versionExtractor } from './shared/interfaces/version-extractor';
import { AppConfig } from './shared/utils/app-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const appConfig = app.get(AppConfig);

  app.enableVersioning({
    type: VersioningType.CUSTOM,
    extractor: versionExtractor,
  });
  app.use(bodyparser.urlencoded({ limit: '100mb', extended: true }));
  app.use(bodyparser.json({ limit: '100mb' }));
  app.enableCors();

  // --- OpenAPI / Swagger ---
  // El spec se autogenera desde los controllers/DTOs (plugin @nestjs/swagger
  // ya activo en nest-cli.json). UI en /api-docs, spec JSON en /api-docs-json.
  // El front custom (clarisa-panel/documentation) consume /api-docs-json.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CLARISA API')
    .setDescription(
      'CLARISA — catalogs as a service del CGIAR. Listas oficiales de instituciones, paises, regiones, entidades CGIAR, areas de impacto, SDGs, innovaciones, etc.',
    )
    .setVersion('2.0.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api-docs-json',
    swaggerOptions: { persistAuthorization: true },
  });

  await dataSource
    .initialize()
    .then(() => {
      console.log('Data Source has been initialized!');
    })
    .catch((err) => {
      console.error('Error during Data Source initialization', err);
    });
  await app.listen(appConfig.appPort);
  console.log(
    `Our server is running on port ${appConfig.appPort} - Please go to "http://localhost:${appConfig.appPort}/" to access the application`,
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
bootstrap();
