# n8n-nodes-apollo

Official Apollo.io community node for [n8n](https://n8n.io). Enrich people and organizations from Apollo's database of 275M+ contacts and 73M+ companies.

## Operations

| Resource | Operation | Description |
|----------|-----------|-------------|
| Person | Enrich | Look up a person by email, name+domain, or LinkedIn URL |
| Person | Bulk Enrich | Enrich up to 10 people in one API call |
| Organization | Enrich | Look up a company by domain |
| Organization | Bulk Enrich | Enrich up to 10 companies by domain |

## Setup

1. Install via **Settings → Community Nodes → Install** in n8n
2. Search for `n8n-nodes-apollo`
3. Create an **Apollo API** credential with your API key from [apollo.io → Settings → Integrations → API](https://app.apollo.io/#/settings/integrations/api_keys)

## Authentication

Uses API Key authentication. Both Standard and Master API keys are supported — Standard keys are sufficient for all enrichment operations.

## Links

- [Apollo API docs](https://docs.apollo.io)
- [n8n community nodes docs](https://docs.n8n.io/integrations/community-nodes/)
