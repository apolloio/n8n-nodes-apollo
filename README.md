# n8n-nodes-apollo

Official Apollo.io community node for [n8n](https://n8n.io). Prospect, enrich, and manage your entire sales workflow against Apollo's database of 275M+ contacts and 73M+ companies — directly from your n8n automations.

This node covers **16 resources** and **70+ operations** spanning enrichment, search, CRM records, sequences, tasks, calls, conversations, and account administration. It can also be used as a tool in n8n AI Agent workflows.

## Installation

1. In n8n go to **Settings → Community Nodes → Install**.
2. Enter `@apolloio/n8n-nodes-apollo` and confirm.
3. Create an **Apollo API** credential (see [Credentials](#credentials)).

## Credentials

Uses **API Key** authentication. Create the credential with your API key from [apollo.io → Settings → Integrations → API](https://app.apollo.io/#/settings/integrations/api_keys).

- The key is sent as the `X-Api-Key` header on every request.
- Both **Standard** and **Master** API keys are supported. Standard keys are sufficient for all enrichment operations; some CRM/admin operations require a Master key or the relevant Apollo plan.
- The credential is validated on save against `GET /users/api_profile`.

## Operations

| Resource | Operations |
|----------|------------|
| **Person** | Enrich, Bulk Enrich, Get, Search |
| **Organization** | Enrich, Bulk Enrich, Get, Get Job Postings, Search |
| **Contact** | Create, Bulk Create, Update, Bulk Update, Get, Search, Update Stage, Update Owner, List Stages |
| **Account** | Create, Bulk Create, Update, Bulk Update, Get, Search, Update Owner, List Stages |
| **Deal** | Create, Update, Get, List All, List Stages, Get Contact Deals |
| **Sequence** | Create, Update, Search, Activate, Deactivate, Archive, Add Contact, Remove Contact, List Email Schedules |
| **Task** | Create, Bulk Create, Update, Get, Search, Complete, Skip |
| **Email** | Create Draft, Send Now, Get Send Status, Get Activities, Search |
| **Call** | Create, Update, Search |
| **Conversation** | Search, Get, Export, Get Export |
| **Label** | Get Many, Create, Update, Add Entities, Remove Entities |
| **Note** | Get Many |
| **Field** | Get Many, Get Custom Fields, Create |
| **User** | Get Profile, List Users, List Email Accounts |
| **Analytics** | Query Report, Get API Usage |
| **Webhook** | Poll Result |

### Resource notes

- **Person / Organization — Enrich**: look up a single record by email, name + domain, or LinkedIn URL (Person) or by domain (Organization). **Bulk Enrich** accepts up to 10 records in a single API call.
- **Contact / Account**: full CRM CRUD plus bulk create/update, owner/stage reassignment, and stage listing. Contacts are people you've added to your Apollo CRM; Accounts are companies.
- **Deal**: manage opportunities, list pipeline stages, and fetch deals associated with a contact.
- **Sequence**: manage outreach sequences and their membership — add/remove contacts, activate/deactivate/archive, and list send schedules.
- **Task / Call / Email / Conversation**: create and search sales-engagement activity. Conversation **Export** is asynchronous — use **Get Export** to poll for the result.
- **Label / Note / Field**: organizational metadata. Labels can be attached to (or removed from) contacts and accounts via **Add/Remove Entities**.
- **Webhook — Poll Result**: retrieve the result of an asynchronous Apollo request by its request ID.

## Usage example — Enrich a lead and add it to a sequence

This end-to-end flow enriches an inbound lead by email and, if a match is found, adds them to an Apollo outreach sequence.

1. **Trigger** — e.g. a *Webhook* or *Form* node that receives a lead's `email`.
2. **Apollo → Person → Enrich**
   - *Email*: `={{ $json.email }}`
   - Returns the matched person, including their Apollo `id`, title, and company.
3. **IF** node — continue only when a match was returned:
   - Condition: `={{ $json.person.id }}` *is not empty*.
4. **Apollo → Sequence → Add Contact**
   - *Sequence*: select the target sequence.
   - *Contact IDs*: `={{ $json.person.id }}`
5. (Optional) **Apollo → Task → Create** to schedule a follow-up for the sequence owner.

The result: every inbound lead is automatically enriched with Apollo's data and enrolled in the right outreach sequence with no manual steps.

## Use as an AI Agent tool

This node declares `usableAsTool: true`, so it can be attached to an **AI Agent** node's tool list. The agent can then call Apollo operations (for example, *Person → Search* or *Organization → Enrich*) on demand as part of a reasoning chain.

## Compatibility

- Requires n8n with `n8nNodesApiVersion` 1.
- Tested against Node.js 18.10+.

## Resources

- [Apollo API docs](https://docs.apollo.io)
- [Apollo API authentication](https://docs.apollo.io/reference/authentication)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](https://github.com/apolloio/n8n-nodes-apollo/blob/main/LICENSE)
