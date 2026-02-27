import fastify from 'fastify';
import cors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';

const server = fastify({ logger: false });
server.register(cors, { origin: true });

// ─── Simulated Audit Log State ────────────────────────────────────────────

const ACTIONS = ['DEPOSIT', 'WITHDRAW', 'KYC_VERIFY', 'LOGIN', 'LOGOUT', 'USER_CREATE', 'FUNDS_TRANSFER', 'CARD_ACCESS', 'REPORT_GENERATE', 'ADMIN_OVERRIDE'];
const USER_IDS = ['u_9f2a', 'u_7b3c', 'u_1e4d', 'u_4c5e', 'u_admin_01', 'u_svc_acct'];
const IPS = ['10.0.1.45', '10.0.2.112', '10.0.1.89', '192.168.1.5', '172.16.0.23'];
const SEVERITIES = ['LOW', 'LOW', 'LOW', 'MEDIUM', 'HIGH'];

let auditLogs: any[] = [];

// Seed initial audit logs
for (let i = 0; i < 12; i++) {
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const isSensitive = ['CARD_ACCESS', 'FUNDS_TRANSFER', 'ADMIN_OVERRIDE'].includes(action);
    auditLogs.push({
        id: uuidv4(),
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        user_id: USER_IDS[Math.floor(Math.random() * USER_IDS.length)],
        action,
        source_ip: IPS[Math.floor(Math.random() * IPS.length)],
        request_id: `req_${uuidv4().slice(0, 8)}`,
        severity: isSensitive ? 'HIGH' : SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)],
        masked: isSensitive,
        change_diff: isSensitive ? '[REDACTED - PCI-DSS]' : `{"before":"state_prev","after":"state_new"}`,
        status: Math.random() > 0.1 ? 'SUCCESS' : 'FAILED',
    });
}
auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

// Generate new audit events continuously
setInterval(() => {
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const isSensitive = ['CARD_ACCESS', 'FUNDS_TRANSFER', 'ADMIN_OVERRIDE'].includes(action);
    auditLogs.unshift({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        user_id: USER_IDS[Math.floor(Math.random() * USER_IDS.length)],
        action,
        source_ip: IPS[Math.floor(Math.random() * IPS.length)],
        request_id: `req_${uuidv4().slice(0, 8)}`,
        severity: isSensitive ? 'HIGH' : SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)],
        masked: isSensitive,
        change_diff: isSensitive ? '[REDACTED - PCI-DSS]' : `{"field":"user_status","before":"PENDING","after":"VERIFIED"}`,
        status: Math.random() > 0.08 ? 'SUCCESS' : 'FAILED',
    });
    if (auditLogs.length > 50) auditLogs.pop();
}, 4000);

// ─── Threat Scanner State ─────────────────────────────────────────────────

type ScanStatus = 'IDLE' | 'RUNNING' | 'COMPLETE';
type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Finding {
    severity: FindingSeverity;
    tool: string;
    title: string;
    desc: string;
    cve?: string;
}

interface ScanJob {
    scan_id: string;
    status: ScanStatus;
    started_at: string;
    completed_at?: string;
    progress: number;
    findings: Finding[];
}

let activeScans: Map<string, ScanJob> = new Map();

// ─── PCI-DSS Compliance Controls ─────────────────────────────────────────

const PCI_CONTROLS = [
    { id: 'PCI-1.1', category: 'Network', title: 'Firewall Configuration Standards', status: 'PASS', detail: 'AWS WAF rules + Security Groups validated' },
    { id: 'PCI-2.1', category: 'Access', title: 'Default Credentials Removed', status: 'PASS', detail: 'All default passwords rotated via Secrets Manager' },
    { id: 'PCI-3.4', category: 'Data', title: 'PAN Data Encryption at Rest', status: 'PASS', detail: 'AES-256 via AWS KMS CMK (us-east-1)' },
    { id: 'PCI-4.1', category: 'Transit', title: 'TLS 1.2+ for Data in Transit', status: 'PASS', detail: 'mTLS via Istio, TLS 1.3 on ALB' },
    { id: 'PCI-6.2', category: 'Code', title: 'SAST / Patch Management', status: 'WARN', detail: 'SonarQube: 2 medium CVEs in lodash (queued)' },
    { id: 'PCI-7.1', category: 'Access', title: 'Least Privilege IAM', status: 'PASS', detail: 'IRSA per microservice, no wildcard policies' },
    { id: 'PCI-8.2', category: 'Auth', title: 'Unique User IDs', status: 'PASS', detail: 'UUID-based user_ids, no shared credentials' },
    { id: 'PCI-10.1', category: 'Audit', title: 'Audit Trail Completeness', status: 'PASS', detail: 'PMLA audit logs in S3 Object Lock (5yr)' },
    { id: 'PCI-10.5', category: 'Audit', title: 'Audit Log Tamper-Proof', status: 'PASS', detail: 'S3 Object Lock COMPLIANCE mode active' },
    { id: 'PCI-11.3', category: 'Scan', title: 'Quarterly Penetration Tests', status: 'WARN', detail: 'Last DAST run: 45 days ago (due < 90d)' },
    { id: 'PCI-12.3', category: 'Policy', title: 'Security Policy Coverage', status: 'PASS', detail: 'IRP, BCP, and DR policies in Confluence' },
];

// ─── API Endpoints ────────────────────────────────────────────────────────

// GET /audit-logs
server.get('/audit-logs', async (req: any, rep) => {
    const limit = parseInt((req.query as any).limit || '20');
    const filter = (req.query as any).severity;
    let logs = auditLogs;
    if (filter) logs = logs.filter(l => l.severity === filter.toUpperCase());
    return logs.slice(0, limit);
});

// GET /compliance
server.get('/compliance', async (_req, rep) => {
    const pass = PCI_CONTROLS.filter(c => c.status === 'PASS').length;
    const warn = PCI_CONTROLS.filter(c => c.status === 'WARN').length;
    const fail = PCI_CONTROLS.filter(c => c.status === 'FAIL').length;
    return {
        score: Math.round((pass / PCI_CONTROLS.length) * 100),
        controls: PCI_CONTROLS,
        summary: { pass, warn, fail, total: PCI_CONTROLS.length },
    };
});

// POST /scan — start a new SAST/DAST/SCA scan
server.post('/scan', async (req: any, rep) => {
    const scanId = uuidv4();
    const job: ScanJob = {
        scan_id: scanId,
        status: 'RUNNING',
        started_at: new Date().toISOString(),
        progress: 0,
        findings: [],
    };
    activeScans.set(scanId, job);

    // Simulate scan pipeline with progressive findings
    const mockFindings: Finding[] = [
        { severity: 'LOW', tool: 'Snyk', title: 'Outdated dependency: uuid@8.x', desc: 'Upgrade to uuid@13.x — no known CVE, best practice', cve: undefined },
        { severity: 'MEDIUM', tool: 'SonarQube', title: 'SQL Query Concatenation', desc: 'Potential injection risk in legacy query builder — refactor to parameterized', cve: 'CWE-89' },
        { severity: 'LOW', tool: 'gitleaks', title: 'No secrets detected', desc: 'Pre-commit hook passed — zero hardcoded secrets in diff' },
        { severity: 'HIGH', tool: 'Trivy', title: 'CVE-2024-29018 in base image', desc: 'node:18-alpine has unpatched OpenSSL. Rebuild with node:20-alpine', cve: 'CVE-2024-29018' },
        { severity: 'LOW', tool: 'OWASP ZAP', title: 'Missing HSTS header (staging)', desc: 'Add Strict-Transport-Security header to ALB response rules' },
        { severity: 'MEDIUM', tool: 'Syft/Grype', title: '2 SBOM CVEs in lodash', desc: 'Prototype pollution risk in lodash < 4.17.21', cve: 'CVE-2021-23337' },
    ];

    let step = 0;
    const interval = setInterval(() => {
        step++;
        job.progress = Math.min(100, step * 17);

        if (step <= mockFindings.length) {
            job.findings.push(mockFindings[step - 1]);
        }

        if (job.progress >= 100) {
            job.status = 'COMPLETE';
            job.completed_at = new Date().toISOString();
            clearInterval(interval);
        }
    }, 1500);

    return rep.code(202).send({ scan_id: scanId, status: 'RUNNING' });
});

// GET /scan/:id — poll scan status
server.get('/scan/:id', async (req: any, rep) => {
    const job = activeScans.get(req.params.id);
    if (!job) return rep.code(404).send({ error: 'Scan not found' });
    return job;
});

// ─── Start ────────────────────────────────────────────────────────────────

const start = async () => {
    try {
        await server.listen({ port: 4003, host: '0.0.0.0' });
        console.log('[Round 4] Security & Compliance API running on http://localhost:4003');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
