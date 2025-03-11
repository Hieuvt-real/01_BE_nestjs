import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const port = configService.get('PORT');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
  );

  app.setGlobalPrefix('api/v1', { exclude: [''] });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  await app.listen(port);
}
void bootstrap();
