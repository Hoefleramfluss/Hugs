import { FastifyInstance } from 'fastify';
import { subscribeToNewsletter } from '../lib/newsletterProvider';

async function newsletterRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: { email: string } }>(
    '/api/newsletter/subscribe',
    async (request, reply) => {
      const { email } = request.body;
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return reply.code(400).send({ error: 'A valid email address is required.' });
      }

      try {
        const result = await subscribeToNewsletter(email);
        if (result.success) {
          fastify.log.info(`New newsletter subscription: ${email}`);
          return { message: 'Successfully subscribed to the newsletter!' };
        } else {
            return reply.code(500).send({ error: 'Could not subscribe to the newsletter.' });
        }
      } catch (error) {
        fastify.log.error(error, `Failed to subscribe ${email} to newsletter.`);
        return reply.code(500).send({ error: 'An error occurred during subscription.' });
      }
    }
  );
}

export default newsletterRoutes;
