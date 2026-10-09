import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Requests reach the API through the gateway nginx (and usually a TLS
  // proxy before it), all on private/loopback addresses. Trusting only those
  // hops makes req.ip the real client — recorded on sessions — while a
  // client can't spoof it with its own X-Forwarded-For.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
