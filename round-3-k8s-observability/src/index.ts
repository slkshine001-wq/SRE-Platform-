import fastify from 'fastify';
import cors from '@fastify/cors';

const server = fastify({ logger: false });
server.register(cors, { origin: true });

// ─── Simulated Cluster State ───────────────────────────────────────────────

const MICROSERVICES = [
    { name: 'user-metadata-service', namespace: 'production', replicas: 3, maxReplicas: 10, cpu: 55, memory: 60, version: 'v1.2.3', status: 'Healthy', port: 54321 },
    { name: 'payment-gateway', namespace: 'production', replicas: 2, maxReplicas: 8, cpu: 78, memory: 72, version: 'v2.0.1', status: 'Healthy', port: 4001 },
    { name: 'notification-service', namespace: 'production', replicas: 1, maxReplicas: 5, cpu: 22, memory: 35, version: 'v1.0.5', status: 'Degraded', port: 0 },
    { name: 'audit-logger', namespace: 'production', replicas: 2, maxReplicas: 4, cpu: 40, memory: 45, version: 'v1.1.0', status: 'Healthy', port: 0 },
    { name: 'api-gateway', namespace: 'production', replicas: 3, maxReplicas: 10, cpu: 65, memory: 55, version: 'v3.1.0', status: 'Healthy', port: 0 },
];

// SLO state — evolves over time
let errorBudgetConsumed = 8.2; // percent
let availabilitySLO = 99.91;
let latencyP95 = 143;
let latencyP99 = 310;
let alertEvents: { ts: string; severity: string; title: string; desc: string }[] = [
    { ts: new Date(Date.now() - 3600000 * 2).toISOString(), severity: 'warning', title: 'Slow Burn Alert', desc: '5% error budget consumed in 24h window' },
    { ts: new Date(Date.now() - 3600000 * 1).toISOString(), severity: 'info', title: 'HPA Scale-Out', desc: 'user-metadata-service scaled from 2→3 pods (CPU: 72%)' },
    { ts: new Date(Date.now() - 1800000).toISOString(), severity: 'info', title: 'Deployment Rolled Out', desc: 'payment-gateway v2.0.1 — 0 rollback events' },
    { ts: new Date(Date.now() - 600000).toISOString(), severity: 'info', title: 'SLO Compliance OK', desc: 'Availability 99.91% ✓ — Latency p95 143ms ✓' },
];

// Slowly evolve the SLO metrics to simulate real drift
setInterval(() => {
    const cpuDrift = (Math.random() - 0.5) * 4;
    const memDrift = (Math.random() - 0.5) * 3;
    const latDrift = (Math.random() - 0.5) * 8;
    const budDrift = (Math.random() * 0.05);

    MICROSERVICES.forEach(svc => {
        svc.cpu = Math.max(5, Math.min(98, svc.cpu + cpuDrift));
        svc.memory = Math.max(10, Math.min(95, svc.memory + memDrift));
    });

    latencyP95 = Math.max(80, Math.min(280, latencyP95 + latDrift));
    latencyP99 = Math.max(150, Math.min(600, latencyP99 + latDrift * 1.5));
    errorBudgetConsumed = Math.min(100, errorBudgetConsumed + budDrift);
    availabilitySLO = Math.max(98.5, 100 - (errorBudgetConsumed * 0.01));

    // Auto-scale pods based on CPU
    MICROSERVICES.forEach(svc => {
        if (svc.cpu > 70 && svc.replicas < svc.maxReplicas) {
            svc.replicas += 1;
            const ev = {
                ts: new Date().toISOString(),
                severity: 'info',
                title: 'HPA Scale-Out',
                desc: `${svc.name} scaled to ${svc.replicas} pods (CPU: ${svc.cpu.toFixed(0)}%)`
            };
            alertEvents.unshift(ev);
            if (alertEvents.length > 20) alertEvents.pop();
        } else if (svc.cpu < 30 && svc.replicas > 1) {
            svc.replicas -= 1;
            const ev = {
                ts: new Date().toISOString(),
                severity: 'info',
                title: 'HPA Scale-In',
                desc: `${svc.name} scaled down to ${svc.replicas} pods (CPU: ${svc.cpu.toFixed(0)}%)`
            };
            alertEvents.unshift(ev);
            if (alertEvents.length > 20) alertEvents.pop();
        }
    });

    // Fire alerts if budget burns fast
    if (errorBudgetConsumed > 80) {
        const last = alertEvents[0];
        if (!last || last.title !== 'Fast Burn Alert') {
            alertEvents.unshift({
                ts: new Date().toISOString(),
                severity: 'critical',
                title: 'Fast Burn Alert',
                desc: `Error budget >80% consumed (${errorBudgetConsumed.toFixed(1)}%). Feature freeze activated.`
            });
        }
    }
}, 3000);

// ─── API Endpoints ─────────────────────────────────────────────────────────

// GET /cluster — pod topology for all services
server.get('/cluster', async (_req, rep) => {
    return MICROSERVICES.map(svc => ({
        name: svc.name,
        namespace: svc.namespace,
        replicas: svc.replicas,
        maxReplicas: svc.maxReplicas,
        cpu: parseFloat(svc.cpu.toFixed(1)),
        memory: parseFloat(svc.memory.toFixed(1)),
        version: svc.version,
        status: svc.status,
        cpuRequests: '100m',
        cpuLimits: '500m',
        memRequests: '128Mi',
        memLimits: '256Mi',
    }));
});

// GET /slo — current SLO health
server.get('/slo', async (_req, rep) => {
    const budgetRemaining = parseFloat((100 - errorBudgetConsumed).toFixed(2));
    const budgetMinutes = parseFloat((budgetRemaining * 0.01 * 43200 / 100).toFixed(0));

    return {
        availability: {
            target: 99.9,
            current: parseFloat(availabilitySLO.toFixed(3)),
            status: availabilitySLO >= 99.9 ? 'MET' : 'BREACHED',
        },
        latency_p95: {
            target_ms: 200,
            current_ms: parseFloat(latencyP95.toFixed(0)),
            status: latencyP95 < 200 ? 'MET' : 'BREACHED',
        },
        latency_p99: {
            target_ms: 500,
            current_ms: parseFloat(latencyP99.toFixed(0)),
            status: latencyP99 < 500 ? 'MET' : 'BREACHED',
        },
        error_budget: {
            total_minutes: 432,
            consumed_pct: parseFloat(errorBudgetConsumed.toFixed(2)),
            remaining_pct: budgetRemaining,
            remaining_minutes: budgetMinutes,
            policy: errorBudgetConsumed >= 80 ? 'FREEZE' : 'NORMAL',
        },
    };
});

// GET /alerts — alert history
server.get('/alerts', async (_req, rep) => {
    return alertEvents.slice(0, 15);
});

// POST /simulate/incident — manually trigger an incident
server.post('/simulate/incident', async (_req, rep) => {
    errorBudgetConsumed += 5;
    alertEvents.unshift({
        ts: new Date().toISOString(),
        severity: 'critical',
        title: 'Simulated Incident',
        desc: `Manual incident injected — error budget burned by 5% (now ${errorBudgetConsumed.toFixed(1)}%)`
    });
    return { ok: true, errorBudgetConsumed };
});

// POST /simulate/scale — manually trigger HPA scaling
server.post('/simulate/scale', async (_req, rep) => {
    const svc = MICROSERVICES.find(s => s.name === 'user-metadata-service')!;
    svc.replicas = Math.min(svc.maxReplicas, svc.replicas + 1);
    svc.cpu = Math.max(30, svc.cpu - 10);
    alertEvents.unshift({
        ts: new Date().toISOString(),
        severity: 'info',
        title: 'Manual Scale-Out',
        desc: `user-metadata-service manually scaled to ${svc.replicas} pods`
    });
    return { ok: true, replicas: svc.replicas };
});

// ─── Start ──────────────────────────────────────────────────────────────────

const start = async () => {
    try {
        await server.listen({ port: 4002, host: '0.0.0.0' });
        console.log('[Round 3] K8s Topology & SLO API running on http://localhost:4002');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
