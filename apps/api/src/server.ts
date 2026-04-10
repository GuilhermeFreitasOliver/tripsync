import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import authPlugin from './plugins/auth';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';

const server = Fastify({
  logger: true
});

// Register plugins
server.register(cors);
server.register(helmet);

// Register Auth and custom plugins
server.register(authPlugin);

// Health check route
server.get('/health', async (request, reply) => {
  return { ok: true };
});

// Register API Routes
server.register(async (api) => {
  api.register(authRoutes, { prefix: '/auth' });
  api.register(userRoutes);
}, { prefix: '/api/v1' });

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
