import fastify from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import cors from '@fastify/cors';

const server = fastify({
    logger: true,
});

server.register(cors, {
    origin: true
});

const serviceSchema = z.object({
    service_name: z.string(),
    team_name: z.string(),
    repo_url: z.string().url(),
});

const services = new Map<string, any>();
const deployments = new Map<string, any>();

// Feature 1: Register a New Microservice & Scaffolding
server.post('/services', async (request, reply) => {
    const body = serviceSchema.parse(request.body);
    const serviceId = uuidv4();

    // Generate Scaffolding (Simulation of reading files)
    const k8sTemplate = fs.readFileSync(path.join(__dirname, '../templates/deployment.yaml.tmpl'), 'utf-8');
    const pipelineTemplate = fs.readFileSync(path.join(__dirname, '../templates/pipeline.yaml.tmpl'), 'utf-8');
    const tfTemplate = fs.readFileSync(path.join(__dirname, '../terraform/main.tf'), 'utf-8');

    const image_url = `aws_account_id.dkr.ecr.us-east-1.amazonaws.com/${body.service_name}:latest`;

    const scaffold = {
        deployment_yaml: k8sTemplate.replace(/{{service_name}}/g, body.service_name).replace(/{{image_url}}/g, image_url),
        pipeline_yaml: pipelineTemplate.replace(/{{service_name}}/g, body.service_name),
        terraform_tf: tfTemplate.replace(/var.service_name/g, `"${body.service_name}"`)
    };

    const serviceData = {
        id: serviceId,
        ...body,
        ecr_repo: `https://${image_url}`,
        iam_role: `arn:aws:iam::123456789012:role/${body.service_name}-role`,
        status: 'REGISTERED',
        scaffold
    };

    services.set(serviceId, serviceData);
    return reply.code(201).send(serviceData);
});

// Feature 2: Trigger a Deployment Job (Simulation)
server.post('/deploy/:service_name', async (request, reply) => {
    const { service_name } = request.params as any;
    const buildId = uuidv4();

    const deployment = {
        build_id: buildId,
        service_name,
        status: 'RUNNING',
        start_time: new Date().toISOString(),
    };

    deployments.set(buildId, deployment);

    // Simulate status update after some time
    setTimeout(() => {
        deployment.status = 'SUCCESS';
    }, 5000);

    return reply.code(202).send(deployment);
});

server.get('/deploy/:build_id', async (request, reply) => {
    const { build_id } = request.params as any;
    const deployment = deployments.get(build_id);
    if (!deployment) return reply.code(404).send({ error: 'Not found' });
    return deployment;
});

// Feature 3: Health Dashboard
server.get('/dashboard', async (request, reply) => {
    const dashboard = Array.from(services.values()).map(s => ({
        service_name: s.service_name,
        last_deployment_time: new Date().toISOString(),
        deployment_status: 'SUCCESS',
        pod_count: 2,
        cpu_usage: '120m',
        memory_usage: '256Mi',
    }));

    return dashboard;
});

const start = async () => {
    try {
        await server.listen({ port: 4001, host: '0.0.0.0' });
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
