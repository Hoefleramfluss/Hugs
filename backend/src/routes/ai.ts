import { FastifyInstance } from 'fastify';
import { GoogleGenAI } from '@google/genai';
import { authenticate } from '../lib/auth';

// Ensure API key is set
if (!process.env.API_KEY) {
  console.warn('Gemini API key is not set in environment variables (API_KEY). AI features will not work.');
}

async function aiRoutes(fastify: FastifyInstance) {
    fastify.post<{ Body: { productName: string, keywords: string } }>(
        '/api/ai/generate-description',
        { preHandler: [authenticate] }, // Protect this route
        async (request, reply) => {
            const { productName, keywords } = request.body;

            if (!process.env.API_KEY) {
                return reply.code(500).send({ error: 'AI service is not configured.' });
            }

            if (!productName) {
                return reply.code(400).send({ error: 'productName is required.' });
            }

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                const prompt = `Generate a compelling and SEO-friendly product description for an e-commerce store.
                Product Name: ${productName}
                Keywords to include: ${keywords || 'high-quality, durable, effective'}
                The description should be around 50-70 words. Highlight the key benefits for the customer.`;

                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt,
                });

                const description = response.text;
                return { description };

            } catch (error: any) {
                fastify.log.error(error, 'Gemini API call failed');
                // Check for specific Gemini errors if possible, otherwise send a generic error
                const errorMessage = error.message || 'Failed to generate description from AI service.';
                return reply.code(500).send({ error: errorMessage });
            }
        }
    );
}

export default aiRoutes;
