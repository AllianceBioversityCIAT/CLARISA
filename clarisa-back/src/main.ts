import { NestFactory } from '@nestjs/core';
import * as bodyparser from 'body-parser';
import { AppModule } from './app.module';
import { dataSource } from './ormconfig';
import 'dotenv/config';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { versionExtractor } from './shared/interfaces/version-extractor';
import { AppConfig } from './shared/utils/app-config';
import { PUBLIC_OPENAPI_PATHS } from './shared/swagger/public-endpoints';

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
      'CLARISA — the CGIAR catalogs-as-a-service. Official control lists of institutions, countries, regions, CGIAR entities, impact areas, SDGs, innovations, and more.',
    )
    .setVersion('2.0.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  // Exponer SOLO los endpoints publicos (control lists, GET de lectura).
  // El resto del API (escritura, auth, admin) NO se documenta, aunque siga
  // existiendo y protegido por sus guards. Ver shared/swagger/public-endpoints.
  const allowed = new Set(PUBLIC_OPENAPI_PATHS);
  const publicPaths: typeof swaggerDocument.paths = {};
  for (const path of Object.keys(swaggerDocument.paths)) {
    if (!allowed.has(path)) continue;
    const ops = swaggerDocument.paths[path];
    if (ops.get) {
      // conservar unicamente el metodo GET de cada path publico
      publicPaths[path] = { get: ops.get };
    }
  }
  swaggerDocument.paths = publicPaths;

  // Podar components.schemas a SOLO los DTOs referenciados (transitivamente)
  // por los paths publicos. Asi el spec crudo no divulga modelos internos
  // (UpdateUserDto, LoginDto, entidades de admin, etc.) -> "zero-leak".
  const allSchemas = swaggerDocument.components?.schemas ?? {};
  const usedSchemas = new Set<string>();
  const collectRefs = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(collectRefs);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') {
        const name = value.split('/').pop();
        if (name && !usedSchemas.has(name)) {
          usedSchemas.add(name);
          collectRefs(allSchemas[name]); // resolver refs anidadas
        }
      } else {
        collectRefs(value);
      }
    }
  };
  collectRefs(publicPaths);
  if (swaggerDocument.components) {
    const prunedSchemas: Record<string, unknown> = {};
    for (const name of usedSchemas) {
      if (allSchemas[name]) prunedSchemas[name] = allSchemas[name];
    }
    swaggerDocument.components.schemas = prunedSchemas as never;
  }

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
