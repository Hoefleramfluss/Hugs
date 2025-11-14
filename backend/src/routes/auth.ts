import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
// Fix: Use named import for Prisma types to resolve module resolution issues.
import { User } from '@prisma/client';

async function authRoutes(fastify: FastifyInstance) {
  // User Registration
  fastify.post<{ Body: Pick<User, 'email' | 'password' | 'name'> }>(
    '/api/auth/register',
    async (request, reply) => {
      const { email, password, name } = request.body;

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required.' });
      }

      const existingUser = await fastify.prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return reply.code(409).send({ error: 'User with this email already exists.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      try {
        const newUser = await fastify.prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            role: 'USER', // Default role
          },
        });

        const token = fastify.jwt.sign({
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
        });

        return { token };
      } catch (error) {
        fastify.log.error(error, 'User registration failed');
        return reply.code(500).send({ error: 'Could not create user.' });
      }
    }
  );

  // User Login
  fastify.post<{ Body: Pick<User, 'email' | 'password'> }>(
    '/api/auth/login',
    async (request, reply) => {
      const { email, password } = request.body;
      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required.' });
      }

      const user = await fastify.prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({ error: 'Invalid email or password.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return reply.code(401).send({ error: 'Invalid email or password.' });
      }

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }
  );
}

export default authRoutes;