import type {
  AppSettings,
  ChatMessage,
  Conversation,
  DocumentChunk,
  SystemComponentStatus,
  TraceDocument,
  UserProfile,
} from '@/types'

export const mockUser: UserProfile = {
  id: 'usr_01',
  name: 'Maya Okafor',
  email: 'maya.okafor@northwind.dev',
  role: 'Platform Engineer',
  workspace: 'Northwind Engineering',
}

export const mockDocuments: TraceDocument[] = [
  {
    id: 'doc_fastapi_deploy',
    name: 'FastAPI Deployment Guide.pdf',
    fileType: 'pdf',
    sizeBytes: 2_483_112,
    uploadedAt: '2026-09-28T14:12:00Z',
    updatedAt: '2026-09-28T14:14:00Z',
    status: 'ready',
    chunkCount: 186,
    pageCount: 42,
    uploadedBy: 'Maya Okafor',
    description: 'Production deployment patterns for FastAPI services behind Gunicorn and Uvicorn workers.',
    tags: ['backend', 'deployment'],
  },
  {
    id: 'doc_auth_rfc',
    name: 'Authentication Service RFC.docx',
    fileType: 'docx',
    sizeBytes: 812_400,
    uploadedAt: '2026-09-27T09:41:00Z',
    updatedAt: '2026-09-27T09:43:00Z',
    status: 'ready',
    chunkCount: 94,
    pageCount: 18,
    uploadedBy: 'Daniel Reyes',
    description: 'Design proposal for token rotation, session lifetimes, and service-to-service auth.',
    tags: ['security', 'rfc'],
  },
  {
    id: 'doc_rate_limits',
    name: 'rate-limiting-policy.md',
    fileType: 'md',
    sizeBytes: 38_210,
    uploadedAt: '2026-09-26T17:05:00Z',
    updatedAt: '2026-09-26T17:05:00Z',
    status: 'ready',
    chunkCount: 21,
    uploadedBy: 'Maya Okafor',
    description: 'Per-tenant and per-route rate limiting policy for the public API gateway.',
    tags: ['api', 'policy'],
  },
  {
    id: 'doc_k8s_runbook',
    name: 'Kubernetes Operations Runbook.pdf',
    fileType: 'pdf',
    sizeBytes: 5_102_880,
    uploadedAt: '2026-09-25T11:20:00Z',
    updatedAt: '2026-09-25T11:26:00Z',
    status: 'ready',
    chunkCount: 312,
    pageCount: 76,
    uploadedBy: 'Priya Natarajan',
    description: 'On-call procedures for cluster scaling, node drains, and failed rollouts.',
    tags: ['infra', 'on-call'],
  },
  {
    id: 'doc_db_migration',
    name: 'Postgres Migration Playbook.pdf',
    fileType: 'pdf',
    sizeBytes: 3_640_500,
    uploadedAt: '2026-09-29T08:02:00Z',
    updatedAt: '2026-09-29T08:02:00Z',
    status: 'processing',
    chunkCount: 0,
    pageCount: 54,
    uploadedBy: 'Maya Okafor',
    description: 'Zero-downtime schema migration strategies and rollback procedures.',
    tags: ['database'],
  },
  {
    id: 'doc_api_reference',
    name: 'public-api-reference-v3.md',
    fileType: 'md',
    sizeBytes: 164_900,
    uploadedAt: '2026-09-22T15:48:00Z',
    updatedAt: '2026-09-22T15:49:00Z',
    status: 'ready',
    chunkCount: 128,
    uploadedBy: 'Daniel Reyes',
    description: 'Endpoint reference for the v3 public REST API, including pagination and error codes.',
    tags: ['api', 'reference'],
  },
  {
    id: 'doc_incident_0814',
    name: 'incident-postmortem-2026-08-14.txt',
    fileType: 'txt',
    sizeBytes: 21_760,
    uploadedAt: '2026-09-18T10:30:00Z',
    updatedAt: '2026-09-18T10:30:00Z',
    status: 'ready',
    chunkCount: 12,
    uploadedBy: 'Priya Natarajan',
    description: 'Postmortem for the August 14 connection pool exhaustion incident.',
    tags: ['incident'],
  },
  {
    id: 'doc_onboarding',
    name: 'Engineering Onboarding Handbook.docx',
    fileType: 'docx',
    sizeBytes: 1_204_300,
    uploadedAt: '2026-09-29T08:10:00Z',
    updatedAt: '2026-09-29T08:10:00Z',
    status: 'queued',
    chunkCount: 0,
    pageCount: 31,
    uploadedBy: 'Maya Okafor',
    tags: ['onboarding'],
  },
  {
    id: 'doc_legacy_sdk',
    name: 'legacy-sdk-notes.txt',
    fileType: 'txt',
    sizeBytes: 9_120,
    uploadedAt: '2026-09-15T13:02:00Z',
    updatedAt: '2026-09-15T13:03:00Z',
    status: 'failed',
    chunkCount: 0,
    uploadedBy: 'Daniel Reyes',
    errorMessage: 'Text extraction failed: file encoding could not be detected (expected UTF-8).',
    tags: ['sdk'],
  },
]

export const mockChunks: DocumentChunk[] = [
  {
    id: 'chk_fd_014',
    documentId: 'doc_fastapi_deploy',
    index: 14,
    section: '3.2 Worker configuration',
    page: 9,
    tokenCount: 412,
    content:
      'Run Uvicorn workers under Gunicorn using the uvicorn.workers.UvicornWorker class. Start with (2 × CPU cores) + 1 workers and tune based on p95 latency under load. Each worker holds its own connection pool, so total database connections scale with worker count.',
  },
  {
    id: 'chk_fd_015',
    documentId: 'doc_fastapi_deploy',
    index: 15,
    section: '3.3 Graceful shutdown',
    page: 10,
    tokenCount: 356,
    content:
      'Set --graceful-timeout to at least the longest expected request duration. Kubernetes sends SIGTERM before removing the pod from endpoints, so add a preStop sleep of 5–10 seconds to avoid dropped requests during rollouts.',
  },
  {
    id: 'chk_fd_031',
    documentId: 'doc_fastapi_deploy',
    index: 31,
    section: '5.1 Health checks',
    page: 17,
    tokenCount: 288,
    content:
      'Expose a lightweight /healthz liveness endpoint that does not touch downstream dependencies. Use a separate /readyz readiness endpoint that verifies database and cache connectivity with a strict 500 ms timeout.',
  },
  {
    id: 'chk_fd_048',
    documentId: 'doc_fastapi_deploy',
    index: 48,
    section: '6.4 Environment configuration',
    page: 23,
    tokenCount: 301,
    content:
      'Load configuration with pydantic-settings. Never bake secrets into the image; mount them at runtime from the secret manager and validate required keys on startup so misconfigured pods fail fast.',
  },
]

export const mockConversations: Conversation[] = [
  {
    id: 'conv_worker_tuning',
    title: 'Tuning Gunicorn workers for FastAPI',
    preview: 'Start with (2 × CPU cores) + 1 workers and tune based on p95 latency…',
    messageCount: 4,
    createdAt: '2026-09-29T09:14:00Z',
    updatedAt: '2026-09-29T09:22:00Z',
  },
  {
    id: 'conv_token_rotation',
    title: 'Refresh token rotation strategy',
    preview: 'The RFC proposes rotating refresh tokens on every use with reuse detection…',
    messageCount: 2,
    createdAt: '2026-09-28T16:40:00Z',
    updatedAt: '2026-09-28T16:41:00Z',
  },
  {
    id: 'conv_rate_limits',
    title: 'Rate limits for the public API',
    preview: 'Free-tier tenants are limited to 60 requests per minute per API key…',
    messageCount: 2,
    createdAt: '2026-09-27T11:05:00Z',
    updatedAt: '2026-09-27T11:06:00Z',
  },
  {
    id: 'conv_node_drain',
    title: 'Safely draining a Kubernetes node',
    preview: 'Cordon the node first, then drain with --ignore-daemonsets and a timeout…',
    messageCount: 2,
    createdAt: '2026-09-24T20:18:00Z',
    updatedAt: '2026-09-24T20:19:00Z',
  },
  {
    id: 'conv_pool_incident',
    title: 'What caused the August connection pool incident?',
    preview: 'The root cause was an unbounded retry loop in the billing worker…',
    messageCount: 2,
    createdAt: '2026-09-19T08:52:00Z',
    updatedAt: '2026-09-19T08:53:00Z',
  },
]

export const mockMessages: ChatMessage[] = [
  {
    id: 'msg_wt_1',
    conversationId: 'conv_worker_tuning',
    role: 'user',
    content: 'How many Gunicorn workers should we run for our FastAPI service in production?',
    createdAt: '2026-09-29T09:14:00Z',
  },
  {
    id: 'msg_wt_2',
    conversationId: 'conv_worker_tuning',
    role: 'assistant',
    createdAt: '2026-09-29T09:14:06Z',
    content: `The deployment guide recommends starting with **(2 × CPU cores) + 1** Uvicorn workers under Gunicorn, then tuning based on observed p95 latency under load [S1].

Keep in mind that every worker maintains its own database connection pool, so total connections grow linearly with worker count [S1]. The August postmortem traced a pool exhaustion incident to exactly this interaction [S2].

A typical starting command for a 4-core container:

\`\`\`bash
gunicorn app.main:app \\
  --worker-class uvicorn.workers.UvicornWorker \\
  --workers 9 \\
  --graceful-timeout 30 \\
  --bind 0.0.0.0:8000
\`\`\`

**Recommended next steps**
- Load test with realistic traffic before raising the worker count.
- Cap the per-worker pool size so \`workers × pool_size\` stays below the database connection limit [S2].`,
    citations: [
      {
        id: 'S1',
        documentId: 'doc_fastapi_deploy',
        documentName: 'FastAPI Deployment Guide.pdf',
        fileType: 'pdf',
        page: 9,
        section: '3.2 Worker configuration',
        excerpt:
          'Run Uvicorn workers under Gunicorn using the uvicorn.workers.UvicornWorker class. Start with (2 × CPU cores) + 1 workers and tune based on p95 latency under load. Each worker holds its own connection pool, so total database connections scale with worker count.',
        relevance: 0.93,
      },
      {
        id: 'S2',
        documentId: 'doc_incident_0814',
        documentName: 'incident-postmortem-2026-08-14.txt',
        fileType: 'txt',
        section: 'Root cause',
        excerpt:
          'After the worker count was raised from 5 to 17 during the traffic spike, the combined pool size (17 × 20 = 340) exceeded the Postgres max_connections limit of 300. New connections were rejected and the billing worker retried without backoff.',
        relevance: 0.81,
      },
    ],
  },
  {
    id: 'msg_wt_3',
    conversationId: 'conv_worker_tuning',
    role: 'user',
    content: 'What graceful timeout should we use during Kubernetes rollouts?',
    createdAt: '2026-09-29T09:21:00Z',
  },
  {
    id: 'msg_wt_4',
    conversationId: 'conv_worker_tuning',
    role: 'assistant',
    createdAt: '2026-09-29T09:21:05Z',
    content: `Set \`--graceful-timeout\` to at least the duration of your longest expected request [S1]. Because Kubernetes sends \`SIGTERM\` before the pod is removed from service endpoints, the guide also recommends a **preStop sleep of 5–10 seconds** so in-flight traffic drains cleanly [S1].

\`\`\`yaml
lifecycle:
  preStop:
    exec:
      command: ["sleep", "10"]
terminationGracePeriodSeconds: 45
\`\`\`

The runbook adds that \`terminationGracePeriodSeconds\` must exceed the preStop sleep plus the graceful timeout, otherwise the kubelet will force-kill the container [S2].`,
    citations: [
      {
        id: 'S1',
        documentId: 'doc_fastapi_deploy',
        documentName: 'FastAPI Deployment Guide.pdf',
        fileType: 'pdf',
        page: 10,
        section: '3.3 Graceful shutdown',
        excerpt:
          'Set --graceful-timeout to at least the longest expected request duration. Kubernetes sends SIGTERM before removing the pod from endpoints, so add a preStop sleep of 5–10 seconds to avoid dropped requests during rollouts.',
        relevance: 0.95,
      },
      {
        id: 'S2',
        documentId: 'doc_k8s_runbook',
        documentName: 'Kubernetes Operations Runbook.pdf',
        fileType: 'pdf',
        page: 33,
        section: '7.2 Pod termination lifecycle',
        excerpt:
          'terminationGracePeriodSeconds must be greater than the sum of the preStop hook duration and the application shutdown timeout. If the period elapses, the kubelet sends SIGKILL regardless of in-flight work.',
        relevance: 0.87,
      },
    ],
  },
  {
    id: 'msg_tr_1',
    conversationId: 'conv_token_rotation',
    role: 'user',
    content: 'What does the auth RFC say about refresh token rotation?',
    createdAt: '2026-09-28T16:40:00Z',
  },
  {
    id: 'msg_tr_2',
    conversationId: 'conv_token_rotation',
    role: 'assistant',
    createdAt: '2026-09-28T16:41:00Z',
    content: `The RFC proposes **rotating refresh tokens on every use** and invalidating the entire token family if a previously used token is presented again [S1]. This "reuse detection" limits the blast radius of a stolen refresh token.

| Token | Lifetime | Storage |
| --- | --- | --- |
| Access token | 15 minutes | Memory only |
| Refresh token | 14 days (sliding) | HttpOnly, Secure cookie |

Service-to-service calls should not use refresh tokens at all; they use short-lived mTLS-bound credentials instead [S2].`,
    citations: [
      {
        id: 'S1',
        documentId: 'doc_auth_rfc',
        documentName: 'Authentication Service RFC.docx',
        fileType: 'docx',
        page: 6,
        section: '4.1 Refresh token rotation',
        excerpt:
          'Each refresh request returns a new refresh token and marks the previous one as consumed. Presenting a consumed token revokes every token in the family and forces re-authentication.',
        relevance: 0.96,
      },
      {
        id: 'S2',
        documentId: 'doc_auth_rfc',
        documentName: 'Authentication Service RFC.docx',
        fileType: 'docx',
        page: 11,
        section: '6.3 Service identity',
        excerpt:
          'Internal services authenticate with workload certificates issued by the mesh CA. Credentials are valid for 24 hours and are bound to the service account via mTLS.',
        relevance: 0.78,
      },
    ],
  },
  {
    id: 'msg_rl_1',
    conversationId: 'conv_rate_limits',
    role: 'user',
    content: 'What are the rate limits for free-tier tenants?',
    createdAt: '2026-09-27T11:05:00Z',
  },
  {
    id: 'msg_rl_2',
    conversationId: 'conv_rate_limits',
    role: 'assistant',
    createdAt: '2026-09-27T11:06:00Z',
    content: `Free-tier tenants are limited to **60 requests per minute per API key**, with a burst allowance of 20 requests [S1]. When the limit is exceeded, the gateway returns \`429 Too Many Requests\` with a \`Retry-After\` header [S2].`,
    citations: [
      {
        id: 'S1',
        documentId: 'doc_rate_limits',
        documentName: 'rate-limiting-policy.md',
        fileType: 'md',
        section: 'Tier limits',
        excerpt: '| Free | 60 req/min | burst 20 | per API key |\n| Team | 600 req/min | burst 100 | per API key |',
        relevance: 0.94,
      },
      {
        id: 'S2',
        documentId: 'doc_api_reference',
        documentName: 'public-api-reference-v3.md',
        fileType: 'md',
        section: 'Errors › 429',
        excerpt:
          'Responses with status 429 include a Retry-After header expressed in seconds. Clients should wait at least this long before retrying.',
        relevance: 0.82,
      },
    ],
  },
  {
    id: 'msg_nd_1',
    conversationId: 'conv_node_drain',
    role: 'user',
    content: 'How do I safely drain a node?',
    createdAt: '2026-09-24T20:18:00Z',
  },
  {
    id: 'msg_nd_2',
    conversationId: 'conv_node_drain',
    role: 'assistant',
    createdAt: '2026-09-24T20:19:00Z',
    content: `Cordon the node first so no new pods are scheduled, then drain it while respecting PodDisruptionBudgets [S1]:

\`\`\`bash
kubectl cordon ip-10-0-42-17
kubectl drain ip-10-0-42-17 --ignore-daemonsets --delete-emptydir-data --timeout=10m
\`\`\``,
    citations: [
      {
        id: 'S1',
        documentId: 'doc_k8s_runbook',
        documentName: 'Kubernetes Operations Runbook.pdf',
        fileType: 'pdf',
        page: 21,
        section: '4.3 Node maintenance',
        excerpt:
          'Always cordon before draining. Use --ignore-daemonsets and a bounded --timeout; if a PDB blocks eviction, escalate rather than forcing deletion.',
        relevance: 0.91,
      },
    ],
  },
  {
    id: 'msg_pi_1',
    conversationId: 'conv_pool_incident',
    role: 'user',
    content: 'What caused the August connection pool incident?',
    createdAt: '2026-09-19T08:52:00Z',
  },
  {
    id: 'msg_pi_2',
    conversationId: 'conv_pool_incident',
    role: 'assistant',
    createdAt: '2026-09-19T08:53:00Z',
    content: `The root cause was an **unbounded retry loop in the billing worker** combined with a worker scale-up that pushed total pool size past the Postgres \`max_connections\` limit [S1].`,
    citations: [
      {
        id: 'S1',
        documentId: 'doc_incident_0814',
        documentName: 'incident-postmortem-2026-08-14.txt',
        fileType: 'txt',
        section: 'Root cause',
        excerpt:
          'After the worker count was raised from 5 to 17 during the traffic spike, the combined pool size (17 × 20 = 340) exceeded the Postgres max_connections limit of 300. New connections were rejected and the billing worker retried without backoff.',
        relevance: 0.97,
      },
    ],
  },
]

export const mockSystemStatus: SystemComponentStatus[] = [
  { id: 'api', name: 'API server', description: 'FastAPI backend', status: 'operational', latencyMs: 42 },
  { id: 'vector', name: 'Vector index', description: '753 chunks indexed', status: 'operational', latencyMs: 18 },
  { id: 'embeddings', name: 'Embedding model', description: 'text-embedding-3-large', status: 'operational', latencyMs: 210 },
  { id: 'worker', name: 'Ingestion worker', description: '2 jobs in queue', status: 'degraded', latencyMs: 1240 },
]

export const defaultSettings: AppSettings = {
  showInlineCitations: true,
  autoExpandSources: false,
  streamResponses: true,
  answerLength: 'balanced',
  retrievalTopK: 6,
  apiBaseUrl: 'http://localhost:8000/api',
}

export const suggestedPrompts: string[] = [
  'How should we configure health checks for FastAPI?',
  'Summarize the refresh token rotation proposal',
  'What rate limits apply to the Team tier?',
  'How do I roll back a failed Kubernetes deployment?',
]
