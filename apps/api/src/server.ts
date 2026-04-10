import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

const server = Fastify({
  logger: true
});

// Register plugins
server.register(cors);
server.register(helmet);

// Health check route
server.get('/health', async (request, reply) => {
  return { ok: true };
});

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
