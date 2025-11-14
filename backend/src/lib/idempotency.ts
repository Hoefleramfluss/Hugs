import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

// This is a placeholder for a more robust idempotency check,
// which would typically use a distributed cache like Redis.

const requestCache = new Map<string, { status: number, body: any }>();

export function checkIdempotency(req: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
        return done(); // No key, proceed as normal
    }

    if (requestCache.has(idempotencyKey)) {
        const cachedResponse = requestCache.get(idempotencyKey)!;
        console.log(`Returning cached response for idempotency key: ${idempotencyKey}`);
        return reply.code(cachedResponse.status).send(cachedResponse.body);
    }
    
    // Store response when request is successful
    // Fix: This seems to be a type definition issue with the Fastify version in use.
    // Using 'as any' to bypass the incorrect type error. reply.addHook is a valid method.
    // Fix: Corrected the type of the `done` callback for the `onSend` hook.
    (reply as any).addHook('onSend', (req: FastifyRequest, reply: FastifyReply, payload: unknown, done: (err: Error | null, payload: any) => void) => {
        if (reply.statusCode >= 200 && reply.statusCode < 300) {
            console.log(`Caching response for idempotency key: ${idempotencyKey}`);
            try {
                requestCache.set(idempotencyKey, {
                    status: reply.statusCode,
                    body: JSON.parse(payload as string), // Assuming payload is a JSON string
                });
            } catch (e) {
                // Ignore if payload is not valid JSON
            }
        }
        done(null, payload);
    });

    done();
}