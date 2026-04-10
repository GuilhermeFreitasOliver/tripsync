import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

export default async function userRoutes(server: FastifyInstance) {
  // GET /me
  server.get('/me', {
    preValidation: [server.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const jwtPayload = request.user as { sub: string; email: string };

    const user = await prisma.user.findUnique({
      where: { id: jwtPayload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        // Exclude password and relations
      }
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ user });
  });
}
