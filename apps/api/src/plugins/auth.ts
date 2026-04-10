import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyOauth2 from '@fastify/oauth2';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import process from 'node:process';
import type { OAuth2Namespace } from '@fastify/oauth2';

export default fp(async (server: FastifyInstance) => {
  // 1. Setup JWT
  server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'supersecret_fallback_key',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  });

  // 2. Setup Cookies
  server.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'cookie_super_secret', 
    hook: 'onRequest',
  });

  // 3. Setup OAuth2 (Google)
  server.register(fastifyOauth2, {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID || 'dummy_client_id_for_dev',
        secret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret_for_dev'
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION
    },
    // the callback route that Google will redirect to
    startRedirectPath: '/api/v1/auth/google',
    callbackUri: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/google/callback`,
    scope: ['profile', 'email']
  });

  // 4. Custom hook: authenticate
  server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});

// Extensões de Tipos
declare module 'fastify' {
  export interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    googleOAuth2: OAuth2Namespace;
  }
}
