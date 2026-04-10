import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import crypto from 'node:crypto';

export default async function authRoutes(server: FastifyInstance) {
  
  // POST /register
  server.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, name } = request.body as any;

    if (!email || !password || !name) {
      return reply.status(400).send({ error: 'Email, password, and name are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(409).send({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    return reply.status(201).send({ message: 'User created successfully', userId: user.id });
  });

  // POST /login
  server.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { accounts: true }
    });
    if (!user || (!user.password && user.accounts.length > 0)) {
      // User with social login shouldn't use password login if they don't have one
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Access Token
    const accessToken = server.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '15m' });
    
    // Refresh Token
    const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days valid

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: refreshTokenRaw,
        expiresAt,
      }
    });

    // Set HttpOnly cookie for Refresh Token
    reply.setCookie('refreshToken', refreshTokenRaw, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return reply.send({ accessToken });
  });

  // POST /refresh
  server.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshTokenRaw = request.cookies.refreshToken;
    if (!refreshTokenRaw) {
      return reply.status(401).send({ error: 'No refresh token provided' });
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken: refreshTokenRaw },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }); // cleanup expired
      }
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }

    // Generate new Access Token
    const accessToken = server.jwt.sign({ sub: session.user.id, email: session.user.email }, { expiresIn: '15m' });

    // Rotate Refresh Token
    const newRefreshTokenRaw = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshTokenRaw,
        expiresAt
      }
    });

    reply.setCookie('refreshToken', newRefreshTokenRaw, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.send({ accessToken });
  });

  // POST /logout
  server.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshTokenRaw = request.cookies.refreshToken;
    if (refreshTokenRaw) {
      await prisma.session.deleteMany({
        where: { refreshToken: refreshTokenRaw }
      });
    }

    reply.clearCookie('refreshToken', { path: '/' });
    return reply.send({ message: 'Logged out successfully' });
  });

  // GET /google is automatically handled by fastifyOauth2 (redirects client to Google login)
  
  // GET /google/callback
  server.get('/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    // fastifyOauth2 injects googleOAuth2 decorator with getAccessTokenFromAuthorizationCodeFlow
    try {
      const { token } = await server.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      // Fetch user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const userInfo = await userInfoResponse.json() as { email: string, name?: string, picture?: string, id: string };

      if (!userInfo.email) {
        return reply.status(400).send({ error: 'Failed to retrieve email from Google' });
      }

      // Find or Create user & account
      let user = await prisma.user.findUnique({
        where: { email: userInfo.email }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name || 'Google User',
            avatarUrl: userInfo.picture,
            accounts: {
              create: {
                provider: 'google',
                providerId: userInfo.id,
              }
            }
          }
        });
      } else {
        // Find if acc exists, if not, create
        const account = await prisma.account.findUnique({
          where: {
            provider_providerId: {
              provider: 'google',
              providerId: userInfo.id
            }
          }
        });

        if (!account) {
          await prisma.account.create({
            data: {
              userId: user.id,
              provider: 'google',
              providerId: userInfo.id
            }
          });
        }
      }

      // Issue tokens
      const accessToken = server.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '15m' });
      const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.session.create({
        data: {
          userId: user.id,
          refreshToken: refreshTokenRaw,
          expiresAt,
        }
      });

      reply.setCookie('refreshToken', refreshTokenRaw, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      });

      // Usually here you'd redirect back to the frontend with the access_token in URL or similar
      // Or if it's SPA, redirect with query params or set a short-lived cookie for the auth token
      const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}?accessToken=${accessToken}`);
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: 'Failed during Google OAuth callback' });
    }
  });
}
