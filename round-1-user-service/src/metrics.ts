import client from 'prom-client';

// Create a Registry which registers the metrics
export const register = new client.Registry();

// Add a default set of metrics
client.collectDefaultMetrics({ register });

export const totalRequests = new client.Counter({
    name: 'total_requests',
    help: 'Total number of requests received',
    labelNames: ['method', 'path', 'status'],
});

export const successCount = new client.Counter({
    name: 'success_count',
    help: 'Total number of successful requests',
    labelNames: ['method', 'path'],
});

export const failureCount = new client.Counter({
    name: 'failure_count',
    help: 'Total number of failed requests',
    labelNames: ['method', 'path', 'error_type'],
});

export const requestLatency = new client.Histogram({
    name: 'request_latency_ms',
    help: 'Request latency in milliseconds',
    labelNames: ['method', 'path'],
    buckets: [10, 50, 100, 200, 500, 1000],
});

register.registerMetric(totalRequests);
register.registerMetric(successCount);
register.registerMetric(failureCount);
register.registerMetric(requestLatency);
