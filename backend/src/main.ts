import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import * as helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  
  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // Security
  app.use(helmet());
  app.use(compression());
  
  // CORS settings
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('Dating App API')
    .setDescription('The Dating App API endpoints')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Start the server
  const port = configService.get('PORT', 3001);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();