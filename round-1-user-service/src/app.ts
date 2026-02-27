import fastify from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { UserRepository, User } from './repository';
import { totalRequests, successCount, failureCount, requestLatency, register } from './metrics';

import cors from '@fastify/cors';

const server = fastify({
    logger: {
        transport: {
            target: 'pino-pretty',
        },
    },
    genReqId: () => uuidv4(),
});

server.register(cors, {
    origin: '*',
});

const userRepository = new UserRepository();

const userSchema = z.object({
    user_id: z.string().optional(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    created_at: z.string().optional(),
});

// Trace middleware to record metrics and log request ID
server.addHook('onRequest', async (request, reply) => {
    request.log.info({ reqId: request.id, method: request.method, url: request.url }, 'Incoming request');
    (request as any).startTime = Date.now();
});

server.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request as any).startTime;
    const path = request.routeOptions?.url || request.url;
    const labels = { method: request.method, path, status: reply.statusCode.toString() };

    totalRequests.inc(labels);
    requestLatency.observe({ method: request.method, path }, duration);

    if (reply.statusCode >= 200 && reply.statusCode < 300) {
        successCount.inc({ method: request.method, path });
    } else {
        failureCount.inc({ method: request.method, path, error_type: 'server_error' });
    }

    request.log.info({ reqId: request.id, latency: duration, status: reply.statusCode }, 'Request completed');
});

// API 1: POST /user
server.post('/user', async (request, reply) => {
    try {
        const body = userSchema.parse(request.body);
        const idempotencyKey = request.headers['x-idempotency-key'] as string;

        const result = await userRepository.createUser(body, idempotencyKey);
        return reply.code(201).send(result);
    } catch (error: any) {
        request.log.error({ reqId: request.id, error: error.message }, 'Error creating user');
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ error: 'Validation failed', details: error.issues });
        }
        return reply.code(500).send({ error: 'Internal Server Error', summary: error.message });
    }
});

// API 2: GET /user/{id}
server.get<{ Params: { id: string } }>('/user/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        const user = await userRepository.getUser(id);
        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }
        return user;
    } catch (error: any) {
        request.log.error({ reqId: request.id, error: error.message }, 'Error fetching user');
        return reply.code(500).send({ error: 'Internal Server Error', summary: error.message });
    }
});

// Metrics endpoint
server.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
});

export default server;
