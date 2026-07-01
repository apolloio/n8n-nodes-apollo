import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const APOLLO_API_BASE = 'https://api.apollo.io/api/v1';

export class Apollo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Apollo',
		name: 'apollo',
		icon: 'file:apollo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Enrich people and organizations using Apollo.io',
		defaults: {
			name: 'Apollo',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'apolloApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Person', value: 'person' },
					{ name: 'Organization', value: 'organization' },
				],
				default: 'person',
			},

			// ─── Person operations ───────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['person'] } },
				options: [
					{
						name: 'Enrich',
						value: 'enrich',
						description: 'Enrich a single person by name, email, or domain',
						action: 'Enrich a person',
					},
					{
						name: 'Bulk Enrich',
						value: 'bulkEnrich',
						description: 'Enrich up to 10 people in one call',
						action: 'Bulk enrich people',
					},
				],
				default: 'enrich',
			},

			// ─── Organization operations ─────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['organization'] } },
				options: [
					{
						name: 'Enrich',
						value: 'enrich',
						description: 'Enrich an organization by domain',
						action: 'Enrich an organization',
					},
					{
						name: 'Bulk Enrich',
						value: 'bulkEnrich',
						description: 'Enrich up to 10 organizations by domain',
						action: 'Bulk enrich organizations',
					},
				],
				default: 'enrich',
			},

			// ─── Person › Enrich fields ──────────────────────────────────────
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@example.com',
				displayOptions: {
					show: { resource: ['person'], operation: ['enrich'] },
				},
				default: '',
				description: "Person's email address (recommended for highest match rate)",
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				displayOptions: {
					show: { resource: ['person'], operation: ['enrich'] },
				},
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				displayOptions: {
					show: { resource: ['person'], operation: ['enrich'] },
				},
				default: '',
			},
			{
				displayName: 'Company Domain',
				name: 'organizationDomain',
				type: 'string',
				placeholder: 'example.com',
				displayOptions: {
					show: { resource: ['person'], operation: ['enrich'] },
				},
				default: '',
				description: "Person's employer domain (improves match rate when combined with name)",
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				placeholder: 'https://www.linkedin.com/in/username',
				displayOptions: {
					show: { resource: ['person'], operation: ['enrich'] },
				},
				default: '',
			},

			// ─── Person › Bulk Enrich fields ────────────────────────────────
			{
				displayName: 'People',
				name: 'people',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, maxValue: 10 },
				displayOptions: {
					show: { resource: ['person'], operation: ['bulkEnrich'] },
				},
				default: { details: [] },
				description: 'Up to 10 people to enrich',
				options: [
					{
						name: 'details',
						displayName: 'Person',
						values: [
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								default: '',
							},
							{
								displayName: 'First Name',
								name: 'first_name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Last Name',
								name: 'last_name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Company Domain',
								name: 'organization_domain',
								type: 'string',
								default: '',
							},
							{
								displayName: 'LinkedIn URL',
								name: 'linkedin_url',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},

			// ─── Organization › Enrich fields ────────────────────────────────
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				placeholder: 'example.com',
				displayOptions: {
					show: { resource: ['organization'], operation: ['enrich'] },
				},
				default: '',
				required: true,
				description: "Organization's website domain",
			},

			// ─── Organization › Bulk Enrich fields ───────────────────────────
			{
				displayName: 'Domains',
				name: 'domains',
				type: 'string',
				displayOptions: {
					show: { resource: ['organization'], operation: ['bulkEnrich'] },
				},
				default: '',
				required: true,
				description: 'Comma-separated list of domains to enrich (up to 10)',
				placeholder: 'example.com, another.com',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

	
			try {
				let responseData: unknown;

				if (resource === 'person' && operation === 'enrich') {
					const body: Record<string, string> = {};
					const email = this.getNodeParameter('email', i, '') as string;
					const firstName = this.getNodeParameter('firstName', i, '') as string;
					const lastName = this.getNodeParameter('lastName', i, '') as string;
					const organizationDomain = this.getNodeParameter('organizationDomain', i, '') as string;
					const linkedinUrl = this.getNodeParameter('linkedinUrl', i, '') as string;

					if (!email && !linkedinUrl && !(firstName && lastName)) {
						throw new NodeOperationError(
							this.getNode(),
							'Provide at least an email, a LinkedIn URL, or both first and last name.',
							{ itemIndex: i },
						);
					}

					if (email) body.email = email;
					if (firstName) body.first_name = firstName;
					if (lastName) body.last_name = lastName;
					if (organizationDomain) body.organization_domain = organizationDomain;
					if (linkedinUrl) body.linkedin_url = linkedinUrl;

					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', {
						method: 'POST',
						url: `${APOLLO_API_BASE}/people/match`,
						body,
					});
				} else if (resource === 'person' && operation === 'bulkEnrich') {
					const people = this.getNodeParameter('people.details', i, []) as Array<
						Record<string, string>
					>;

					if (!people.length) {
						throw new NodeOperationError(this.getNode(), 'Add at least one person to enrich.', {
							itemIndex: i,
						});
					}

					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', {
						method: 'POST',
						url: `${APOLLO_API_BASE}/people/bulk_match`,
						body: { details: people },
					});
				} else if (resource === 'organization' && operation === 'enrich') {
					const domain = this.getNodeParameter('domain', i) as string;

					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', {
						method: 'GET',
						url: `${APOLLO_API_BASE}/organizations/enrich`,
						qs: { domain },
					});
				} else if (resource === 'organization' && operation === 'bulkEnrich') {
					const domainsRaw = this.getNodeParameter('domains', i) as string;
					const domains = domainsRaw
						.split(',')
						.map((d) => d.trim())
						.filter(Boolean)
						.slice(0, 10);

					if (!domains.length) {
						throw new NodeOperationError(this.getNode(), 'Provide at least one domain.', {
							itemIndex: i,
						});
					}

					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', {
						method: 'POST',
						url: `${APOLLO_API_BASE}/organizations/bulk_enrich`,
						body: { domains },
					});
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unknown operation: ${resource}/${operation}`,
						{ itemIndex: i },
					);
				}

				results.push({ json: responseData as IDataObject, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					results.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [results];
	}
}
