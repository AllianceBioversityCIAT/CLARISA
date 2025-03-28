import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { ApiModule } from './api/api.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { routes } from './routes';
import { ScheduleModule } from '@nestjs/schedule';
import { User } from './api/user/entities/user.entity';
import { dataSource } from './ormconfig';
import { AuthModule } from './auth/auth.module';
import { GuardsModule } from './shared/guards/guards.module';
import { BasicAuthMiddleware } from './shared/guards/basic-auth.middleware';
import { RequestLoggingInterceptor } from './shared/interceptors/request-logging.interceptor';
import { ResponseFormattingInterceptor } from './shared/interceptors/response-formatting.interceptor';
import { ExceptionsFilter } from './shared/filters/exceptions.filter';
import { IntegrationModule } from './integration/integration.module';
import { CacheModule } from '@nestjs/cache-manager';
import { GlobalModule } from './global.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSource.options,
      autoLoadEntities: true,
    }),
    ScheduleModule.forRoot(),
    RouterModule.register(routes),
    TypeOrmModule.forFeature([User]),
    CacheModule.register({
      ttl: 8 * 60 * 60 * 1000, // 8 hours
      max: 100,
      isGlobal: true,
    }),
    ApiModule,
    AuthModule,
    IntegrationModule,
    GuardsModule,
    GlobalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: ExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseFormattingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BasicAuthMiddleware)
      .forRoutes(
        { path: 'api/*', method: RequestMethod.POST },
        { path: 'api/*', method: RequestMethod.PUT },
        { path: 'api/*', method: RequestMethod.PATCH },
        { path: 'api/*', method: RequestMethod.DELETE },
      );
  }
}
