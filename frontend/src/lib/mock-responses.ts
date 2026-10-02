import type { Citation } from '@/types'

interface CannedResponse {
  keywords: string[]
  content: string
  citations: Citation[]
}

const healthCheckResponse: CannedResponse = {
  keywords: ['health', 'readiness', 'liveness', 'probe'],
  content: `Use two separate endpoints [S1]:

- **\`/healthz\` (liveness)** — returns immediately and never touches downstream dependencies.
- **\`/readyz\` (readiness)** — verifies database and cache connectivity with a strict **500 ms** timeout.

\`\`\`python
from fastapi import FastAPI, Response, status

app = FastAPI()

@app.get("/healthz")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/readyz")
async def readiness(response: Response) -> dict[str, str]:
    if not await dependencies_ready(timeout=0.5):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unavailable"}
    return {"status": "ready"}
\`\`\`

The runbook recommends pointing the Kubernetes \`readinessProbe\` at \`/readyz\` with \`failureThreshold: 3\` so a brief database blip does not evict every pod at once [S2].`,
  citations: [
    {
      id: 'S1',
      documentId: 'doc_fastapi_deploy',
      documentName: 'FastAPI Deployment Guide.pdf',
      fileType: 'pdf',
      page: 17,
      section: '5.1 Health checks',
      excerpt:
        'Expose a lightweight /healthz liveness endpoint that does not touch downstream dependencies. Use a separate /readyz readiness endpoint that verifies database and cache connectivity with a strict 500 ms timeout.',
      relevance: 0.95,
    },
    {
      id: 'S2',
      documentId: 'doc_k8s_runbook',
      documentName: 'Kubernetes Operations Runbook.pdf',
      fileType: 'pdf',
      page: 28,
      section: '6.1 Probe configuration',
      excerpt:
        'Readiness probes should tolerate transient dependency failures. Use failureThreshold: 3 and periodSeconds: 10 so pods are only removed after sustained failure.',
      relevance: 0.84,
    },
  ],
}

const tokenResponse: CannedResponse = {
  keywords: ['token', 'auth', 'refresh', 'session', 'rotation'],
  content: `The Authentication RFC proposes three core changes [S1]:

1. **Rotate refresh tokens on every use.** Each refresh returns a new token and marks the old one as consumed.
2. **Detect reuse.** Presenting a consumed token revokes the entire token family.
3. **Shorten access tokens** to 15 minutes and keep them in memory only.

Internal services are explicitly excluded from this flow and authenticate with mesh-issued workload certificates instead [S2].`,
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
      relevance: 0.79,
    },
  ],
}

const rateLimitResponse: CannedResponse = {
  keywords: ['rate', 'limit', 'tier', '429', 'throttle'],
  content: `Team-tier tenants get **600 requests per minute per API key** with a burst allowance of 100 [S1]. Limits are enforced at the gateway using a sliding window.

When a client exceeds its limit, the API responds with \`429 Too Many Requests\` and a \`Retry-After\` header in seconds [S2]:

\`\`\`http
HTTP/1.1 429 Too Many Requests
Retry-After: 12
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 0
\`\`\``,
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
      relevance: 0.86,
    },
  ],
}

const rollbackResponse: CannedResponse = {
  keywords: ['rollback', 'roll back', 'rollout', 'deploy', 'kubernetes', 'k8s'],
  content: `The runbook describes a two-step rollback for failed deployments [S1]:

\`\`\`bash
# Inspect revision history
kubectl rollout history deployment/api -n production

# Roll back to the previous healthy revision
kubectl rollout undo deployment/api -n production --to-revision=41
\`\`\`

After rolling back, confirm the rollout completed with \`kubectl rollout status\` and page the owning team if error rates do not recover within 10 minutes [S1].`,
  citations: [
    {
      id: 'S1',
      documentId: 'doc_k8s_runbook',
      documentName: 'Kubernetes Operations Runbook.pdf',
      fileType: 'pdf',
      page: 44,
      section: '9.1 Failed rollouts',
      excerpt:
        'Use kubectl rollout undo with an explicit --to-revision rather than relying on the implicit previous revision. Verify with kubectl rollout status and escalate if SLOs are not restored within 10 minutes.',
      relevance: 0.92,
    },
  ],
}

const fallbackResponse: CannedResponse = {
  keywords: [],
  content: `I searched your indexed documentation and found related guidance, though not a direct answer to that exact question.

The closest match is the deployment guide's section on environment configuration, which recommends loading settings with \`pydantic-settings\` and validating required keys on startup so misconfigured services fail fast [S1].

If this doesn't cover what you need, try uploading the relevant document or rephrasing with specific service or component names.`,
  citations: [
    {
      id: 'S1',
      documentId: 'doc_fastapi_deploy',
      documentName: 'FastAPI Deployment Guide.pdf',
      fileType: 'pdf',
      page: 23,
      section: '6.4 Environment configuration',
      excerpt:
        'Load configuration with pydantic-settings. Never bake secrets into the image; mount them at runtime from the secret manager and validate required keys on startup so misconfigured pods fail fast.',
      relevance: 0.64,
    },
  ],
}

const cannedResponses = [healthCheckResponse, tokenResponse, rateLimitResponse, rollbackResponse]

export function pickCannedResponse(question: string): Pick<CannedResponse, 'content' | 'citations'> {
  const normalized = question.toLowerCase()
  const match = cannedResponses.find((response) =>
    response.keywords.some((keyword) => normalized.includes(keyword)),
  )
  return match ?? fallbackResponse
}
