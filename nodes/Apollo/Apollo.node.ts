import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const BASE = 'https://api.apollo.io/api/v1';

function splitCsv(val: string): string[] {
	return val.split(',').map(s => s.trim()).filter(Boolean);
}

function buildBody(fields: IDataObject): IDataObject {
	const body: IDataObject = {};
	for (const [key, val] of Object.entries(fields)) {
		if (val === '' || val === undefined || val === null) continue;
		if (key.endsWith('_csv') || key === 'label_names') {
			body[key.replace('_csv', '')] = splitCsv(val as string);
		} else {
			body[key] = val;
		}
	}
	return body;
}

export class Apollo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Apollo',
		name: 'apollo',
		icon: 'file:apollo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Apollo.io — prospect, enrich, and manage your entire sales workflow',
		usableAsTool: true,
		defaults: { name: 'Apollo' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'apolloApi', required: true }],
		properties: [
			// ── Resource ──────────────────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Analytics', value: 'analytics' },
					{ name: 'Call', value: 'call' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Conversation', value: 'conversation' },
					{ name: 'Deal', value: 'deal' },
					{ name: 'Email', value: 'email' },
					{ name: 'Field', value: 'field' },
					{ name: 'Label', value: 'label' },
					{ name: 'Note', value: 'note' },
					{ name: 'Organization', value: 'organization' },
					{ name: 'Person', value: 'person' },
					{ name: 'Sequence', value: 'sequence' },
					{ name: 'Task', value: 'task' },
					{ name: 'User', value: 'user' },
					{ name: 'Webhook', value: 'webhook' },
				],
				default: 'person',
			},

			// ── Operations ────────────────────────────────────────────────────────

			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['person'] } },
				options: [
					{ name: 'Bulk Enrich', value: 'bulkEnrich', description: 'Enrich up to 10 people in one call', action: 'Bulk enrich people' },
					{ name: 'Enrich', value: 'enrich', description: 'Enrich a single person by email, name, or LinkedIn URL', action: 'Enrich a person' },
					{ name: 'Get', value: 'get', description: 'Get complete person info by ID', action: 'Get a person' },
					{ name: 'Search', value: 'search', description: 'Search for people using filters', action: 'Search people' },
				],
				default: 'enrich',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['contact'] } },
				options: [
					{ name: 'Bulk Create', value: 'bulkCreate', action: 'Bulk create contacts' },
					{ name: 'Bulk Update', value: 'bulkUpdate', action: 'Bulk update contacts' },
					{ name: 'Create', value: 'create', action: 'Create a contact' },
					{ name: 'Get', value: 'get', action: 'Get a contact' },
					{ name: 'List Stages', value: 'listStages', action: 'List contact stages' },
					{ name: 'Search', value: 'search', action: 'Search contacts' },
					{ name: 'Update', value: 'update', action: 'Update a contact' },
					{ name: 'Update Owner', value: 'updateOwner', description: 'Reassign owner for multiple contacts', action: 'Update contact owner' },
					{ name: 'Update Stage', value: 'updateStage', description: 'Update stage for multiple contacts', action: 'Update contact stage' },
				],
				default: 'search',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{ name: 'Bulk Create', value: 'bulkCreate', action: 'Bulk create accounts' },
					{ name: 'Bulk Update', value: 'bulkUpdate', action: 'Bulk update accounts' },
					{ name: 'Create', value: 'create', action: 'Create an account' },
					{ name: 'Get', value: 'get', action: 'Get an account' },
					{ name: 'List Stages', value: 'listStages', action: 'List account stages' },
					{ name: 'Search', value: 'search', action: 'Search accounts' },
					{ name: 'Update', value: 'update', action: 'Update an account' },
					{ name: 'Update Owner', value: 'updateOwner', description: 'Reassign owner for multiple accounts', action: 'Update account owner' },
				],
				default: 'search',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['organization'] } },
				options: [
					{ name: 'Bulk Enrich', value: 'bulkEnrich', action: 'Bulk enrich organizations' },
					{ name: 'Enrich', value: 'enrich', action: 'Enrich an organization' },
					{ name: 'Get', value: 'get', action: 'Get complete organization info' },
					{ name: 'Get Job Postings', value: 'jobPostings', action: 'Get job postings for an organization' },
					{ name: 'Search', value: 'search', action: 'Search organizations' },
				],
				default: 'enrich',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['deal'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a deal' },
					{ name: 'Get', value: 'get', action: 'Get a deal' },
					{ name: 'Get Contact Deals', value: 'contactDeals', description: 'Get deals associated with a contact', action: 'Get contact deals' },
					{ name: 'List All', value: 'list', action: 'List all deals' },
					{ name: 'List Stages', value: 'listStages', action: 'List deal stages' },
					{ name: 'Update', value: 'update', action: 'Update a deal' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['sequence'] } },
				options: [
					{ name: 'Activate', value: 'activate', action: 'Activate a sequence' },
					{ name: 'Add Contact', value: 'addContact', action: 'Add contact to sequence' },
					{ name: 'Archive', value: 'archive', action: 'Archive a sequence' },
					{ name: 'Create', value: 'create', action: 'Create a sequence' },
					{ name: 'Deactivate', value: 'deactivate', action: 'Deactivate a sequence' },
					{ name: 'List Email Schedules', value: 'listSchedules', action: 'List email schedules' },
					{ name: 'Remove Contact', value: 'removeContact', action: 'Remove contact from sequence' },
					{ name: 'Search', value: 'search', action: 'Search sequences' },
					{ name: 'Update', value: 'update', action: 'Update a sequence' },
				],
				default: 'search',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['task'] } },
				options: [
					{ name: 'Bulk Create', value: 'bulkCreate', action: 'Bulk create tasks' },
					{ name: 'Complete', value: 'complete', action: 'Complete a task' },
					{ name: 'Create', value: 'create', action: 'Create a task' },
					{ name: 'Get', value: 'get', action: 'Get a task' },
					{ name: 'Search', value: 'search', action: 'Search tasks' },
					{ name: 'Skip', value: 'skip', action: 'Skip a task' },
					{ name: 'Update', value: 'update', action: 'Update a task' },
				],
				default: 'search',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['email'] } },
				options: [
					{ name: 'Create Draft', value: 'create', action: 'Create an email draft' },
					{ name: 'Get Activities', value: 'getActivities', action: 'Get email activities' },
					{ name: 'Get Send Status', value: 'getSendStatus', action: 'Get email send status' },
					{ name: 'Search', value: 'search', action: 'Search outreach emails' },
					{ name: 'Send Now', value: 'sendNow', action: 'Send email now' },
				],
				default: 'create',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['call'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a call record' },
					{ name: 'Search', value: 'search', action: 'Search calls' },
					{ name: 'Update', value: 'update', action: 'Update a call record' },
				],
				default: 'search',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['conversation'] } },
				options: [
					{ name: 'Export', value: 'export', action: 'Export conversations' },
					{ name: 'Get', value: 'get', action: 'Get a conversation' },
					{ name: 'Get Export', value: 'getExport', description: 'Poll async export result', action: 'Get conversation export' },
					{ name: 'Search', value: 'search', action: 'Search conversations' },
				],
				default: 'search',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['label'] } },
				options: [
					{ name: 'Add Entities', value: 'addEntities', action: 'Add records to a label' },
					{ name: 'Create', value: 'create', action: 'Create a label' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many labels' },
					{ name: 'Remove Entities', value: 'removeEntities', action: 'Remove records from a label' },
					{ name: 'Update', value: 'update', action: 'Update a label' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['note'] } },
				options: [
					{ name: 'Get Many', value: 'getAll', action: 'Get many notes' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['field'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a custom field' },
					{ name: 'Get Custom Fields', value: 'getCustomFields', action: 'Get all custom fields' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many fields' },
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['user'] } },
				options: [
					{ name: 'Get Profile', value: 'getProfile', action: 'Get current user profile' },
					{ name: 'List Email Accounts', value: 'listEmailAccounts', action: 'List email accounts' },
					{ name: 'List Users', value: 'list', action: 'List all users' },
				],
				default: 'getProfile',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['analytics'] } },
				options: [
					{ name: 'Get API Usage', value: 'getUsage', action: 'Get API usage stats and rate limits' },
					{ name: 'Query Report', value: 'queryReport', description: 'Query an analytics sync report', action: 'Query analytics report' },
				],
				default: 'queryReport',
			},
			{
				displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
				displayOptions: { show: { resource: ['webhook'] } },
				options: [
					{ name: 'Poll Result', value: 'pollResult', description: 'Poll the result of an async webhook request', action: 'Poll webhook result' },
				],
				default: 'pollResult',
			},

			// ════════════════════════════════════════════════════════════════════════
			// SHARED ID FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{ displayName: 'Person ID', name: 'personId', type: 'string', displayOptions: { show: { resource: ['person'], operation: ['get'] } }, default: '', required: true },
			{ displayName: 'Contact ID', name: 'contactId', type: 'string', displayOptions: { show: { resource: ['contact'], operation: ['get', 'update'] } }, default: '', required: true },
			{ displayName: 'Account ID', name: 'accountId', type: 'string', displayOptions: { show: { resource: ['account'], operation: ['get', 'update'] } }, default: '', required: true },
			{ displayName: 'Organization ID', name: 'organizationId', type: 'string', displayOptions: { show: { resource: ['organization'], operation: ['get', 'jobPostings'] } }, default: '', required: true },
			{ displayName: 'Deal ID', name: 'dealId', type: 'string', displayOptions: { show: { resource: ['deal'], operation: ['get', 'update'] } }, default: '', required: true },
			{ displayName: 'Task ID', name: 'taskId', type: 'string', displayOptions: { show: { resource: ['task'], operation: ['get', 'update', 'complete', 'skip'] } }, default: '', required: true },
			{ displayName: 'Sequence ID', name: 'sequenceId', type: 'string', displayOptions: { show: { resource: ['sequence'], operation: ['update', 'activate', 'deactivate', 'archive', 'addContact', 'removeContact'] } }, default: '', required: true },
			{ displayName: 'Email Message ID', name: 'emailMessageId', type: 'string', displayOptions: { show: { resource: ['email'], operation: ['sendNow', 'getActivities'] } }, default: '', required: true },
			{ displayName: 'Call ID', name: 'callId', type: 'string', displayOptions: { show: { resource: ['call'], operation: ['update'] } }, default: '', required: true },
			{ displayName: 'Conversation ID', name: 'conversationId', type: 'string', displayOptions: { show: { resource: ['conversation'], operation: ['get'] } }, default: '', required: true },
			{ displayName: 'Export ID', name: 'exportId', type: 'string', displayOptions: { show: { resource: ['conversation'], operation: ['getExport'] } }, default: '', required: true, description: 'The async export job ID' },
			{ displayName: 'Label ID', name: 'labelId', type: 'string', displayOptions: { show: { resource: ['label'], operation: ['update'] } }, default: '', required: true },
			{ displayName: 'Request ID', name: 'requestId', type: 'string', displayOptions: { show: { resource: ['webhook'], operation: ['pollResult'] } }, default: '', required: true, description: 'Async webhook request ID to poll' },
			{
				displayName: 'Contact ID (for Deals)',
				name: 'contactIdForDeals',
				type: 'string',
				displayOptions: { show: { resource: ['deal'], operation: ['contactDeals'] } },
				default: '',
				required: true,
			},

			// ════════════════════════════════════════════════════════════════════════
			// PERSON FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@example.com', displayOptions: { show: { resource: ['person'], operation: ['enrich'] } }, default: '', description: "Person's email address" },
			{ displayName: 'First Name', name: 'firstName', type: 'string', displayOptions: { show: { resource: ['person'], operation: ['enrich'] } }, default: '' },
			{ displayName: 'Last Name', name: 'lastName', type: 'string', displayOptions: { show: { resource: ['person'], operation: ['enrich'] } }, default: '' },
			{ displayName: 'Company Domain', name: 'organizationDomain', type: 'string', placeholder: 'example.com', displayOptions: { show: { resource: ['person'], operation: ['enrich'] } }, default: '' },
			{ displayName: 'LinkedIn URL', name: 'linkedinUrl', type: 'string', displayOptions: { show: { resource: ['person'], operation: ['enrich'] } }, default: '' },

			{
				displayName: 'People',
				name: 'people',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, maxValue: 10 },
				displayOptions: { show: { resource: ['person'], operation: ['bulkEnrich'] } },
				default: { details: [] },
				options: [{
					name: 'details', displayName: 'Person',
					values: [
						{ displayName: 'Email', name: 'email', type: 'string', default: '' },
						{ displayName: 'First Name', name: 'first_name', type: 'string', default: '' },
						{ displayName: 'Last Name', name: 'last_name', type: 'string', default: '' },
						{ displayName: 'Company Domain', name: 'organization_domain', type: 'string', default: '' },
						{ displayName: 'LinkedIn URL', name: 'linkedin_url', type: 'string', default: '' },
					],
				}],
			},

			{
				displayName: 'Search Filters',
				name: 'personSearchFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['person'], operation: ['search'] } },
				default: {},
				options: [
					{ displayName: 'Page', name: 'page', type: 'number', default: 1 },
					{ displayName: 'Per Page', name: 'per_page', type: 'number', default: 25 },
					{ displayName: 'Job Titles (comma-separated)', name: 'person_titles', type: 'string', default: '' },
					{ displayName: 'Seniority Levels', name: 'person_seniorities', type: 'multiOptions', options: [
						{ name: 'C-Suite', value: 'c_suite' }, { name: 'Director', value: 'director' }, { name: 'Entry', value: 'entry' },
						{ name: 'Head', value: 'head' }, { name: 'Manager', value: 'manager' }, { name: 'Owner', value: 'owner' },
						{ name: 'Partner', value: 'partner' }, { name: 'VP', value: 'vp' },
					], default: [] },
					{ displayName: 'Locations (comma-separated)', name: 'person_locations', type: 'string', default: '' },
					{ displayName: 'Company Domains (comma-separated)', name: 'organization_domains', type: 'string', default: '' },
					{ displayName: 'Min Employees', name: 'org_employees_min', type: 'number', default: 0 },
					{ displayName: 'Max Employees', name: 'org_employees_max', type: 'number', default: 0 },
					{ displayName: 'Keywords', name: 'q_keywords', type: 'string', default: '' },
				],
			},

			// ════════════════════════════════════════════════════════════════════════
			// CONTACT FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{
				displayName: 'Fields',
				name: 'contactFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: { show: { resource: ['contact'], operation: ['create', 'update'] } },
				default: {},
				options: [
					{ displayName: 'First Name', name: 'first_name', type: 'string', default: '' },
					{ displayName: 'Last Name', name: 'last_name', type: 'string', default: '' },
					{ displayName: 'Email', name: 'email', type: 'string', default: '' },
					{ displayName: 'Title', name: 'title', type: 'string', default: '' },
					{ displayName: 'Organization Name', name: 'organization_name', type: 'string', default: '' },
					{ displayName: 'Website URL', name: 'website_url', type: 'string', default: '' },
					{ displayName: 'LinkedIn URL', name: 'linkedin_url', type: 'string', default: '' },
					{ displayName: 'Phone', name: 'direct_phone', type: 'string', default: '' },
					{ displayName: 'Label Names (comma-separated)', name: 'label_names', type: 'string', default: '' },
					{ displayName: 'Account ID', name: 'account_id', type: 'string', default: '' },
					{ displayName: 'Stage Name', name: 'contact_stage_name', type: 'string', default: '' },
					{ displayName: 'Owner ID', name: 'owner_id', type: 'string', default: '' },
				],
			},

			{
				displayName: 'Contacts',
				name: 'contacts',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, maxValue: 10 },
				displayOptions: { show: { resource: ['contact'], operation: ['bulkCreate'] } },
				default: { details: [] },
				options: [{
					name: 'details', displayName: 'Contact',
					values: [
						{ displayName: 'First Name', name: 'first_name', type: 'string', default: '' },
						{ displayName: 'Last Name', name: 'last_name', type: 'string', default: '' },
						{ displayName: 'Email', name: 'email', type: 'string', default: '' },
						{ displayName: 'Title', name: 'title', type: 'string', default: '' },
						{ displayName: 'Organization Name', name: 'organization_name', type: 'string', default: '' },
						{ displayName: 'LinkedIn URL', name: 'linkedin_url', type: 'string', default: '' },
					],
				}],
			},

			{
				displayName: 'Contact Updates',
				name: 'contactUpdates',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, maxValue: 10 },
				displayOptions: { show: { resource: ['contact'], operation: ['bulkUpdate'] } },
				default: { details: [] },
				options: [{
					name: 'details', displayName: 'Contact',
					values: [
						{ displayName: 'Contact ID', name: 'id', type: 'string', default: '', description: 'ID of the contact to update' },
						{ displayName: 'First Name', name: 'first_name', type: 'string', default: '' },
						{ displayName: 'Last Name', name: 'last_name', type: 'string', default: '' },
						{ displayName: 'Email', name: 'email', type: 'string', default: '' },
						{ displayName: 'Title', name: 'title', type: 'string', default: '' },
					],
				}],
			},

			{
				displayName: 'Search Filters',
				name: 'contactSearchFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['contact'], operation: ['search'] } },
				default: {},
				options: [
					{ displayName: 'Page', name: 'page', type: 'number', default: 1 },
					{ displayName: 'Per Page', name: 'per_page', type: 'number', default: 25 },
					{ displayName: 'Name', name: 'display_name', type: 'string', default: '' },
					{ displayName: 'Email', name: 'email', type: 'string', default: '' },
					{ displayName: 'Label Names (comma-separated)', name: 'label_names', type: 'string', default: '' },
					{ displayName: 'Account ID', name: 'account_id', type: 'string', default: '' },
					{ displayName: 'Sort By', name: 'sort_by_field', type: 'options', options: [
						{ name: 'Created At', value: 'contact_created_at' },
						{ name: 'Updated At', value: 'contact_updated_at' },
						{ name: 'Last Activity', value: 'contact_last_activity_date' },
					], default: 'contact_created_at' },
					{ displayName: 'Sort Ascending', name: 'sort_ascending', type: 'boolean', default: false },
				],
			},

			{
				displayName: 'Contact IDs (comma-separated)',
				name: 'contactIdsForStage',
				type: 'string',
				displayOptions: { show: { resource: ['contact'], operation: ['updateStage'] } },
				default: '', required: true,
			},
			{
				displayName: 'Stage Name',
				name: 'stageName',
				type: 'string',
				displayOptions: { show: { resource: ['contact'], operation: ['updateStage'] } },
				default: '', required: true,
			},
			{
				displayName: 'Contact IDs (comma-separated)',
				name: 'contactIdsForOwner',
				type: 'string',
				displayOptions: { show: { resource: ['contact'], operation: ['updateOwner'] } },
				default: '', required: true,
			},
			{
				displayName: 'Owner ID',
				name: 'newOwnerId',
				type: 'string',
				displayOptions: { show: { resource: ['contact', 'account'], operation: ['updateOwner'] } },
				default: '', required: true,
			},

			// ════════════════════════════════════════════════════════════════════════
			// ACCOUNT FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{
				displayName: 'Fields',
				name: 'accountFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: { show: { resource: ['account'], operation: ['create', 'update'] } },
				default: {},
				options: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Domain', name: 'domain', type: 'string', default: '' },
					{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
					{ displayName: 'Website URL', name: 'website_url', type: 'string', default: '' },
					{ displayName: 'LinkedIn URL', name: 'linkedin_url', type: 'string', default: '' },
					{ displayName: 'Raw Address', name: 'raw_address', type: 'string', default: '' },
					{ displayName: 'Label Names (comma-separated)', name: 'label_names', type: 'string', default: '' },
					{ displayName: 'Stage Name', name: 'account_stage_name', type: 'string', default: '' },
					{ displayName: 'Owner ID', name: 'owner_id', type: 'string', default: '' },
				],
			},

			{
				displayName: 'Accounts',
				name: 'accounts',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, maxValue: 10 },
				displayOptions: { show: { resource: ['account'], operation: ['bulkCreate'] } },
				default: { details: [] },
				options: [{
					name: 'details', displayName: 'Account',
					values: [
						{ displayName: 'Name', name: 'name', type: 'string', default: '' },
						{ displayName: 'Domain', name: 'domain', type: 'string', default: '' },
						{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
						{ displayName: 'Website URL', name: 'website_url', type: 'string', default: '' },
					],
				}],
			},

			{
				displayName: 'Account Updates',
				name: 'accountUpdates',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, maxValue: 10 },
				displayOptions: { show: { resource: ['account'], operation: ['bulkUpdate'] } },
				default: { details: [] },
				options: [{
					name: 'details', displayName: 'Account',
					values: [
						{ displayName: 'Account ID', name: 'id', type: 'string', default: '' },
						{ displayName: 'Name', name: 'name', type: 'string', default: '' },
						{ displayName: 'Domain', name: 'domain', type: 'string', default: '' },
						{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
					],
				}],
			},

			{
				displayName: 'Search Filters',
				name: 'accountSearchFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['account'], operation: ['search'] } },
				default: {},
				options: [
					{ displayName: 'Page', name: 'page', type: 'number', default: 1 },
					{ displayName: 'Per Page', name: 'per_page', type: 'number', default: 25 },
					{ displayName: 'Name', name: 'display_name', type: 'string', default: '' },
					{ displayName: 'Domain', name: 'domain', type: 'string', default: '' },
					{ displayName: 'Label Names (comma-separated)', name: 'label_names', type: 'string', default: '' },
					{ displayName: 'Sort By', name: 'sort_by_field', type: 'options', options: [
						{ name: 'Created At', value: 'account_created_at' },
						{ name: 'Updated At', value: 'account_updated_at' },
						{ name: 'Last Activity', value: 'account_last_activity_date' },
					], default: 'account_created_at' },
					{ displayName: 'Sort Ascending', name: 'sort_ascending', type: 'boolean', default: false },
				],
			},

			{
				displayName: 'Account IDs (comma-separated)',
				name: 'accountIdsForOwner',
				type: 'string',
				displayOptions: { show: { resource: ['account'], operation: ['updateOwner'] } },
				default: '', required: true,
			},

			// ════════════════════════════════════════════════════════════════════════
			// ORGANIZATION FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{ displayName: 'Domain', name: 'domain', type: 'string', placeholder: 'example.com', displayOptions: { show: { resource: ['organization'], operation: ['enrich'] } }, default: '', required: true },
			{ displayName: 'Domains (comma-separated)', name: 'domains', type: 'string', displayOptions: { show: { resource: ['organization'], operation: ['bulkEnrich'] } }, default: '', required: true, placeholder: 'example.com, another.com' },

			{
				displayName: 'Search Filters',
				name: 'orgSearchFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['organization'], operation: ['search'] } },
				default: {},
				options: [
					{ displayName: 'Page', name: 'page', type: 'number', default: 1 },
					{ displayName: 'Per Page', name: 'per_page', type: 'number', default: 25 },
					{ displayName: 'Keywords (comma-separated)', name: 'q_organization_keyword_tags', type: 'string', default: '' },
					{ displayName: 'Locations (comma-separated)', name: 'organization_locations', type: 'string', default: '' },
					{ displayName: 'Min Employees', name: 'org_employees_min', type: 'number', default: 0 },
					{ displayName: 'Max Employees', name: 'org_employees_max', type: 'number', default: 0 },
				],
			},

			// ════════════════════════════════════════════════════════════════════════
			// DEAL FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{
				displayName: 'Fields',
				name: 'dealFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: { show: { resource: ['deal'], operation: ['create', 'update'] } },
				default: {},
				options: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Amount', name: 'amount', type: 'number', default: 0 },
					{ displayName: 'Stage Name', name: 'opportunity_stage_name', type: 'string', default: '' },
					{ displayName: 'Close Date', name: 'closed_date', type: 'dateTime', default: '' },
					{ displayName: 'Account ID', name: 'account_id', type: 'string', default: '' },
					{ displayName: 'Contact ID', name: 'contact_id', type: 'string', default: '' },
					{ displayName: 'Owner ID', name: 'owner_id', type: 'string', default: '' },
				],
			},

			// ════════════════════════════════════════════════════════════════════════
			// SEQUENCE FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{
				displayName: 'Fields',
				name: 'sequenceFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: { show: { resource: ['sequence'], operation: ['create', 'update'] } },
				default: {},
				options: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Active', name: 'active', type: 'boolean', default: true },
					{ displayName: 'Label Names (comma-separated)', name: 'label_names', type: 'string', default: '' },
				],
			},

			{
				displayName: 'Contact IDs (comma-separated)',
				name: 'sequenceContactIds',
				type: 'string',
				displayOptions: { show: { resource: ['sequence'], operation: ['addContact', 'removeContact'] } },
				default: '', required: true,
			},
			{
				displayName: 'Email Account ID',
				name: 'emailAccountId',
				type: 'string',
				displayOptions: { show: { resource: ['sequence'], operation: ['addContact'] } },
				default: '',
				description: 'Email account ID to send from (optional)',
			},

			{
				displayName: 'Search Filters',
				name: 'sequenceSearchFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['sequence'], operation: ['search'] } },
				default: {},
				options: [
					{ displayName: 'Page', name: 'page', type: 'number', default: 1 },
					{ displayName: 'Per Page', name: 'per_page', type: 'number', default: 25 },
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
				],
			},

			// ════════════════════════════════════════════════════════════════════════
			// TASK FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{
				displayName: 'Fields',
				name: 'taskFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: { show: { resource: ['task'], operation: ['create', 'update'] } },
				default: {},
				options: [
					{ displayName: 'Type', name: 'type', type: 'options', options: [
						{ name: 'Action Item', value: 'action_item' }, { name: 'Call', value: 'call' },
						{ name: 'Email', value: 'email' }, { name: 'LinkedIn', value: 'linkedin' },
					], default: 'action_item' },
					{ displayName: 'Priority', name: 'priority', type: 'options', options: [
						{ name: 'High', value: 'high' }, { name: 'Medium', value: 'medium' }, { name: 'Low', value: 'low' },
					], default: 'medium' },
					{ displayName: 'Due Date', name: 'due_at', type: 'dateTime', default: '' },
					{ displayName: 'Note', name: 'note', type: 'string', typeOptions: { rows: 3 }, default: '' },
					{ displayName: 'Contact ID', name: 'contact_id', type: 'string', default: '' },
					{ displayName: 'Assignee User ID', name: 'user_id', type: 'string', default: '' },
				],
			},

			{
				displayName: 'Tasks',
				name: 'tasks',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, maxValue: 10 },
				displayOptions: { show: { resource: ['task'], operation: ['bulkCreate'] } },
				default: { details: [] },
				options: [{
					name: 'details', displayName: 'Task',
					values: [
						{ displayName: 'Type', name: 'type', type: 'options', options: [
							{ name: 'Action Item', value: 'action_item' }, { name: 'Call', value: 'call' },
							{ name: 'Email', value: 'email' }, { name: 'LinkedIn', value: 'linkedin' },
						], default: 'action_item' },
						{ displayName: 'Priority', name: 'priority', type: 'options', options: [
							{ name: 'High', value: 'high' }, { name: 'Medium', value: 'medium' }, { name: 'Low', value: 'low' },
						], default: 'medium' },
						{ displayName: 'Due Date', name: 'due_at', type: 'dateTime', default: '' },
						{ displayName: 'Contact ID', name: 'contact_id', type: 'string', default: '' },
						{ displayName: 'Note', name: 'note', type: 'string', default: '' },
					],
				}],
			},

			{
				displayName: 'Search Filters',
				name: 'taskSearchFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['task'], operation: ['search'] } },
				default: {},
				options: [
					{ displayName: 'Page', name: 'page', type: 'number', default: 1 },
					{ displayName: 'Per Page', name: 'per_page', type: 'number', default: 25 },
					{ displayName: 'Open Tasks Only', name: 'open_only', type: 'boolean', default: true },
					{ displayName: 'Type', name: 'task_types', type: 'multiOptions', options: [
						{ name: 'Action Item', value: 'action_item' }, { name: 'Call', value: 'call' },
						{ name: 'Email', value: 'email' }, { name: 'LinkedIn', value: 'linkedin' },
					], default: [] },
				],
			},

			// ════════════════════════════════════════════════════════════════════════
			// EMAIL FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{
				displayName: 'Fields',
				name: 'emailFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: { show: { resource: ['email'], operation: ['create'] } },
				default: {},
				options: [
					{ displayName: 'To', name: 'to', type: 'string', default: '' },
					{ displayName: 'Subject', name: 'subject', type: 'string', default: '' },
					{ displayName: 'Body (HTML)', name: 'body_html', type: 'string', typeOptions: { rows: 5 }, default: '' },
					{ displayName: 'Sequence Step ID', name: 'emailer_step_id', type: 'string', default: '' },
					{ displayName: 'Sequence ID', name: 'emailer_campaign_id', type: 'string', default: '' },
					{ displayName: 'Send At', name: 'send_at', type: 'dateTime', default: '' },
				],
			},

			{
				displayName: 'Email Message ID',
				name: 'emailMessageIdForStatus',
				type: 'string',
				displayOptions: { show: { resource: ['email'], operation: ['getSendStatus'] } },
				default: '', required: true,
			},

			// ════════════════════════════════════════════════════════════════════════
			// CALL FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{
				displayName: 'Fields',
				name: 'callFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: { show: { resource: ['call'], operation: ['create', 'update'] } },
				default: {},
				options: [
					{ displayName: 'Contact ID', name: 'contact_id', type: 'string', default: '' },
					{ displayName: 'Duration (seconds)', name: 'duration', type: 'number', default: 0 },
					{ displayName: 'Status', name: 'status', type: 'options', options: [
						{ name: 'No Answer', value: 'no_answer' }, { name: 'Connected', value: 'connected' },
						{ name: 'Left Message', value: 'left_message' }, { name: 'Not Attempted', value: 'not_attempted' },
					], default: 'connected' },
					{ displayName: 'Direction', name: 'direction', type: 'options', options: [
						{ name: 'Outbound', value: 'outbound' }, { name: 'Inbound', value: 'inbound' },
					], default: 'outbound' },
					{ displayName: 'Note', name: 'note', type: 'string', typeOptions: { rows: 3 }, default: '' },
					{ displayName: 'Called At', name: 'called_at', type: 'dateTime', default: '' },
				],
			},

			// ════════════════════════════════════════════════════════════════════════
			// CONVERSATION FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{
				displayName: 'Search Filters',
				name: 'conversationSearchFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['conversation'], operation: ['search', 'export'] } },
				default: {},
				options: [
					{ displayName: 'Page', name: 'page', type: 'number', default: 1 },
					{ displayName: 'Per Page', name: 'per_page', type: 'number', default: 25 },
					{ displayName: 'Contact ID', name: 'contact_id', type: 'string', default: '' },
					{ displayName: 'Account ID', name: 'account_id', type: 'string', default: '' },
				],
			},

			// ════════════════════════════════════════════════════════════════════════
			// LABEL FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{ displayName: 'Label Name', name: 'labelName', type: 'string', displayOptions: { show: { resource: ['label'], operation: ['create'] } }, default: '', required: true },
			{ displayName: 'New Label Name', name: 'labelNewName', type: 'string', displayOptions: { show: { resource: ['label'], operation: ['update'] } }, default: '', required: true },

			{
				displayName: 'Label Names (comma-separated)',
				name: 'labelNames',
				type: 'string',
				displayOptions: { show: { resource: ['label'], operation: ['addEntities', 'removeEntities'] } },
				default: '', required: true,
			},
			{
				displayName: 'Entity Type',
				name: 'labelEntityType',
				type: 'options',
				displayOptions: { show: { resource: ['label'], operation: ['addEntities', 'removeEntities'] } },
				options: [{ name: 'Account', value: 'accounts' }, { name: 'Contact', value: 'contacts' }],
				default: 'contacts',
			},
			{
				displayName: 'Entity IDs (comma-separated)',
				name: 'labelEntityIds',
				type: 'string',
				displayOptions: { show: { resource: ['label'], operation: ['addEntities', 'removeEntities'] } },
				default: '', required: true,
			},

			// ════════════════════════════════════════════════════════════════════════
			// FIELD FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{
				displayName: 'Fields',
				name: 'fieldCreateFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: { show: { resource: ['field'], operation: ['create'] } },
				default: {},
				options: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Type', name: 'type', type: 'options', options: [
						{ name: 'Text', value: 'text' }, { name: 'Number', value: 'number' },
						{ name: 'Date', value: 'date' }, { name: 'Picklist', value: 'picklist' },
					], default: 'text' },
					{ displayName: 'Entity Type', name: 'entity_type', type: 'options', options: [
						{ name: 'Contact', value: 'contact' }, { name: 'Account', value: 'account' },
					], default: 'contact' },
				],
			},

			// ════════════════════════════════════════════════════════════════════════
			// ANALYTICS FIELDS
			// ════════════════════════════════════════════════════════════════════════

			{
				displayName: 'Report Filters',
				name: 'analyticsFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				displayOptions: { show: { resource: ['analytics'], operation: ['queryReport'] } },
				default: {},
				options: [
					{ displayName: 'Start Date', name: 'start_date', type: 'dateTime', default: '' },
					{ displayName: 'End Date', name: 'end_date', type: 'dateTime', default: '' },
					{ displayName: 'User IDs (comma-separated)', name: 'user_ids', type: 'string', default: '' },
					{ displayName: 'Team IDs (comma-separated)', name: 'team_ids', type: 'string', default: '' },
				],
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

				// ── Person ─────────────────────────────────────────────────────────
				if (resource === 'person') {
					if (operation === 'enrich') {
						const email = this.getNodeParameter('email', i, '') as string;
						const firstName = this.getNodeParameter('firstName', i, '') as string;
						const lastName = this.getNodeParameter('lastName', i, '') as string;
						const organizationDomain = this.getNodeParameter('organizationDomain', i, '') as string;
						const linkedinUrl = this.getNodeParameter('linkedinUrl', i, '') as string;

						if (!email && !linkedinUrl && !(firstName && lastName)) {
							throw new NodeOperationError(this.getNode(), 'Provide at least an email, a LinkedIn URL, or both first and last name.', { itemIndex: i });
						}

						const body: IDataObject = {};
						if (email) body.email = email;
						if (firstName) body.first_name = firstName;
						if (lastName) body.last_name = lastName;
						if (organizationDomain) body.organization_domain = organizationDomain;
						if (linkedinUrl) body.linkedin_url = linkedinUrl;

						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/people/match`, body });

					} else if (operation === 'bulkEnrich') {
						const people = this.getNodeParameter('people.details', i, []) as IDataObject[];
						if (!people.length) throw new NodeOperationError(this.getNode(), 'Add at least one person.', { itemIndex: i });
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/people/bulk_match`, body: { details: people } });

					} else if (operation === 'get') {
						const personId = this.getNodeParameter('personId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/people/${personId}` });

					} else if (operation === 'search') {
						const filters = this.getNodeParameter('personSearchFilters', i, {}) as IDataObject;
						const body: IDataObject = { page: filters.page || 1, per_page: filters.per_page || 25 };
						if (filters.person_titles) body.person_titles = splitCsv(filters.person_titles as string);
						if (filters.person_seniorities) body.person_seniorities = filters.person_seniorities;
						if (filters.person_locations) body.person_locations = splitCsv(filters.person_locations as string);
						if (filters.organization_domains) body.organization_domains = splitCsv(filters.organization_domains as string);
						if (filters.q_keywords) body.q_keywords = filters.q_keywords;
						if (filters.org_employees_min || filters.org_employees_max) {
							body.organization_num_employees_ranges = [`${filters.org_employees_min || 1},${filters.org_employees_max || 1000000}`];
						}
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/mixed_people/search`, body });
					}

				// ── Contact ────────────────────────────────────────────────────────
				} else if (resource === 'contact') {
					if (operation === 'get') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/contacts/${contactId}` });

					} else if (operation === 'create') {
						const body = buildBody(this.getNodeParameter('contactFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/contacts`, body });

					} else if (operation === 'bulkCreate') {
						const contacts = this.getNodeParameter('contacts.details', i, []) as IDataObject[];
						if (!contacts.length) throw new NodeOperationError(this.getNode(), 'Add at least one contact.', { itemIndex: i });
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/contacts/bulk_create`, body: { contacts_with_labels: contacts } });

					} else if (operation === 'update') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const body = buildBody(this.getNodeParameter('contactFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'PATCH', url: `${BASE}/contacts/${contactId}`, body });

					} else if (operation === 'bulkUpdate') {
						const contacts = this.getNodeParameter('contactUpdates.details', i, []) as IDataObject[];
						if (!contacts.length) throw new NodeOperationError(this.getNode(), 'Add at least one contact.', { itemIndex: i });
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/contacts/bulk_update`, body: { contacts } });

					} else if (operation === 'search') {
						const filters = this.getNodeParameter('contactSearchFilters', i, {}) as IDataObject;
						const body: IDataObject = { page: filters.page || 1, per_page: filters.per_page || 25 };
						if (filters.display_name) body.display_name = filters.display_name;
						if (filters.email) body.email = filters.email;
						if (filters.account_id) body.account_id = filters.account_id;
						if (filters.label_names) body.label_names = splitCsv(filters.label_names as string);
						if (filters.sort_by_field) body.sort_by_field = filters.sort_by_field;
						if (filters.sort_ascending !== undefined) body.sort_ascending = filters.sort_ascending;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/contacts/search`, body });

					} else if (operation === 'updateStage') {
						const contactIds = splitCsv(this.getNodeParameter('contactIdsForStage', i) as string);
						const stageName = this.getNodeParameter('stageName', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/contacts/update_stages`, body: { contact_ids: contactIds, contact_stage_name: stageName } });

					} else if (operation === 'updateOwner') {
						const contactIds = splitCsv(this.getNodeParameter('contactIdsForOwner', i) as string);
						const ownerId = this.getNodeParameter('newOwnerId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/contacts/update_owners`, body: { contact_ids: contactIds, owner_id: ownerId } });

					} else if (operation === 'listStages') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/contact_stages` });
					}

				// ── Account ────────────────────────────────────────────────────────
				} else if (resource === 'account') {
					if (operation === 'get') {
						const accountId = this.getNodeParameter('accountId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/accounts/${accountId}` });

					} else if (operation === 'create') {
						const body = buildBody(this.getNodeParameter('accountFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/accounts`, body });

					} else if (operation === 'bulkCreate') {
						const accounts = this.getNodeParameter('accounts.details', i, []) as IDataObject[];
						if (!accounts.length) throw new NodeOperationError(this.getNode(), 'Add at least one account.', { itemIndex: i });
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/accounts/bulk_create`, body: { accounts_with_labels: accounts } });

					} else if (operation === 'update') {
						const accountId = this.getNodeParameter('accountId', i) as string;
						const body = buildBody(this.getNodeParameter('accountFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'PATCH', url: `${BASE}/accounts/${accountId}`, body });

					} else if (operation === 'bulkUpdate') {
						const accounts = this.getNodeParameter('accountUpdates.details', i, []) as IDataObject[];
						if (!accounts.length) throw new NodeOperationError(this.getNode(), 'Add at least one account.', { itemIndex: i });
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/accounts/bulk_update`, body: { accounts } });

					} else if (operation === 'search') {
						const filters = this.getNodeParameter('accountSearchFilters', i, {}) as IDataObject;
						const body: IDataObject = { page: filters.page || 1, per_page: filters.per_page || 25 };
						if (filters.display_name) body.display_name = filters.display_name;
						if (filters.domain) body.domain = filters.domain;
						if (filters.label_names) body.label_names = splitCsv(filters.label_names as string);
						if (filters.sort_by_field) body.sort_by_field = filters.sort_by_field;
						if (filters.sort_ascending !== undefined) body.sort_ascending = filters.sort_ascending;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/accounts/search`, body });

					} else if (operation === 'updateOwner') {
						const accountIds = splitCsv(this.getNodeParameter('accountIdsForOwner', i) as string);
						const ownerId = this.getNodeParameter('newOwnerId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/accounts/update_owners`, body: { account_ids: accountIds, owner_id: ownerId } });

					} else if (operation === 'listStages') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/account_stages` });
					}

				// ── Organization ───────────────────────────────────────────────────
				} else if (resource === 'organization') {
					if (operation === 'enrich') {
						const domain = this.getNodeParameter('domain', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/organizations/enrich`, qs: { domain } });

					} else if (operation === 'bulkEnrich') {
						const domains = splitCsv(this.getNodeParameter('domains', i) as string).slice(0, 10);
						if (!domains.length) throw new NodeOperationError(this.getNode(), 'Provide at least one domain.', { itemIndex: i });
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/organizations/bulk_enrich`, body: { domains } });

					} else if (operation === 'get') {
						const organizationId = this.getNodeParameter('organizationId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/organizations/${organizationId}` });

					} else if (operation === 'search') {
						const filters = this.getNodeParameter('orgSearchFilters', i, {}) as IDataObject;
						const body: IDataObject = { page: filters.page || 1, per_page: filters.per_page || 25 };
						if (filters.q_organization_keyword_tags) body.q_organization_keyword_tags = splitCsv(filters.q_organization_keyword_tags as string);
						if (filters.organization_locations) body.organization_locations = splitCsv(filters.organization_locations as string);
						if (filters.org_employees_min || filters.org_employees_max) {
							body.organization_num_employees_ranges = [`${filters.org_employees_min || 1},${filters.org_employees_max || 1000000}`];
						}
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/mixed_companies/search`, body });

					} else if (operation === 'jobPostings') {
						const organizationId = this.getNodeParameter('organizationId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/organizations/${organizationId}/job_postings` });
					}

				// ── Deal ───────────────────────────────────────────────────────────
				} else if (resource === 'deal') {
					if (operation === 'list') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/opportunities/search` });

					} else if (operation === 'get') {
						const dealId = this.getNodeParameter('dealId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/opportunities/${dealId}` });

					} else if (operation === 'create') {
						const body = buildBody(this.getNodeParameter('dealFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/opportunities`, body });

					} else if (operation === 'update') {
						const dealId = this.getNodeParameter('dealId', i) as string;
						const body = buildBody(this.getNodeParameter('dealFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'PATCH', url: `${BASE}/opportunities/${dealId}`, body });

					} else if (operation === 'listStages') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/opportunity_stages` });

					} else if (operation === 'contactDeals') {
						const contactId = this.getNodeParameter('contactIdForDeals', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/contacts/${contactId}/opportunities` });
					}

				// ── Sequence ───────────────────────────────────────────────────────
				} else if (resource === 'sequence') {
					if (operation === 'search') {
						const filters = this.getNodeParameter('sequenceSearchFilters', i, {}) as IDataObject;
						const body: IDataObject = { page: filters.page || 1, per_page: filters.per_page || 25 };
						if (filters.name) body.name = filters.name;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/emailer_campaigns/search`, body });

					} else if (operation === 'create') {
						const body = buildBody(this.getNodeParameter('sequenceFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/sequences`, body });

					} else if (operation === 'update') {
						const sequenceId = this.getNodeParameter('sequenceId', i) as string;
						const body = buildBody(this.getNodeParameter('sequenceFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'PUT', url: `${BASE}/sequences/${sequenceId}`, body });

					} else if (operation === 'activate') {
						const sequenceId = this.getNodeParameter('sequenceId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/emailer_campaigns/${sequenceId}/approve` });

					} else if (operation === 'deactivate') {
						const sequenceId = this.getNodeParameter('sequenceId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/emailer_campaigns/${sequenceId}/abort` });

					} else if (operation === 'archive') {
						const sequenceId = this.getNodeParameter('sequenceId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/emailer_campaigns/${sequenceId}/archive` });

					} else if (operation === 'addContact') {
						const sequenceId = this.getNodeParameter('sequenceId', i) as string;
						const contactIds = splitCsv(this.getNodeParameter('sequenceContactIds', i) as string);
						const emailAccountId = this.getNodeParameter('emailAccountId', i, '') as string;
						const body: IDataObject = { contact_ids: contactIds };
						if (emailAccountId) body.email_account_id = emailAccountId;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/emailer_campaigns/${sequenceId}/add_contact_ids`, body });

					} else if (operation === 'removeContact') {
						const contactIds = splitCsv(this.getNodeParameter('sequenceContactIds', i) as string);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/emailer_campaigns/remove_or_stop_contact_ids`, body: { contact_ids: contactIds } });

					} else if (operation === 'listSchedules') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/emailer_schedules` });
					}

				// ── Task ───────────────────────────────────────────────────────────
				} else if (resource === 'task') {
					if (operation === 'get') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/tasks/${taskId}` });

					} else if (operation === 'create') {
						const body = buildBody(this.getNodeParameter('taskFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/tasks`, body });

					} else if (operation === 'bulkCreate') {
						const tasks = this.getNodeParameter('tasks.details', i, []) as IDataObject[];
						if (!tasks.length) throw new NodeOperationError(this.getNode(), 'Add at least one task.', { itemIndex: i });
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/tasks/bulk_create`, body: { tasks } });

					} else if (operation === 'update') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const body = buildBody(this.getNodeParameter('taskFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'PATCH', url: `${BASE}/tasks/${taskId}`, body });

					} else if (operation === 'search') {
						const filters = this.getNodeParameter('taskSearchFilters', i, {}) as IDataObject;
						const body: IDataObject = { page: filters.page || 1, per_page: filters.per_page || 25 };
						if (filters.open_only) body.open_factor_names = ['task_is_pending'];
						if (filters.task_types && (filters.task_types as string[]).length) body.task_types = filters.task_types;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/tasks/search`, body });

					} else if (operation === 'complete') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/tasks/${taskId}/complete` });

					} else if (operation === 'skip') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/tasks/${taskId}/skip` });
					}

				// ── Email ──────────────────────────────────────────────────────────
				} else if (resource === 'email') {
					if (operation === 'create') {
						const body = buildBody(this.getNodeParameter('emailFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/emailer_messages`, body });

					} else if (operation === 'sendNow') {
						const emailMessageId = this.getNodeParameter('emailMessageId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/emailer_messages/${emailMessageId}/send_now` });

					} else if (operation === 'getSendStatus') {
						const emailMessageId = this.getNodeParameter('emailMessageIdForStatus', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/emailer_messages/email_send_status`, body: { emailer_message_ids: [emailMessageId] } });

					} else if (operation === 'getActivities') {
						const emailMessageId = this.getNodeParameter('emailMessageId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/emailer_messages/${emailMessageId}/activities` });

					} else if (operation === 'search') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/emailer_messages/search` });
					}

				// ── Call ───────────────────────────────────────────────────────────
				} else if (resource === 'call') {
					if (operation === 'create') {
						const body = buildBody(this.getNodeParameter('callFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/phone_calls`, body });

					} else if (operation === 'update') {
						const callId = this.getNodeParameter('callId', i) as string;
						const body = buildBody(this.getNodeParameter('callFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'PUT', url: `${BASE}/phone_calls/${callId}`, body });

					} else if (operation === 'search') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/phone_calls/search` });
					}

				// ── Conversation ───────────────────────────────────────────────────
				} else if (resource === 'conversation') {
					if (operation === 'search') {
						const filters = this.getNodeParameter('conversationSearchFilters', i, {}) as IDataObject;
						const body: IDataObject = { page: filters.page || 1, per_page: filters.per_page || 25 };
						if (filters.contact_id) body.contact_id = filters.contact_id;
						if (filters.account_id) body.account_id = filters.account_id;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/conversations/search`, body });

					} else if (operation === 'get') {
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/conversations/${conversationId}` });

					} else if (operation === 'export') {
						const filters = this.getNodeParameter('conversationSearchFilters', i, {}) as IDataObject;
						const body: IDataObject = {};
						if (filters.contact_id) body.contact_id = filters.contact_id;
						if (filters.account_id) body.account_id = filters.account_id;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/conversations/export`, body });

					} else if (operation === 'getExport') {
						const exportId = this.getNodeParameter('exportId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/conversations/export/${exportId}` });
					}

				// ── Label ──────────────────────────────────────────────────────────
				} else if (resource === 'label') {
					if (operation === 'getAll') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/labels` });

					} else if (operation === 'create') {
						const name = this.getNodeParameter('labelName', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/labels`, body: { name } });

					} else if (operation === 'update') {
						const labelId = this.getNodeParameter('labelId', i) as string;
						const name = this.getNodeParameter('labelNewName', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'PATCH', url: `${BASE}/labels/${labelId}`, body: { name } });

					} else if (operation === 'addEntities') {
						const labelNames = splitCsv(this.getNodeParameter('labelNames', i) as string);
						const entityType = this.getNodeParameter('labelEntityType', i) as string;
						const entityIds = splitCsv(this.getNodeParameter('labelEntityIds', i) as string);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/labels/add_entity_ids_to_label_names`, body: { label_names: labelNames, entity_ids: entityIds, entity_type: entityType } });

					} else if (operation === 'removeEntities') {
						const labelNames = splitCsv(this.getNodeParameter('labelNames', i) as string);
						const entityType = this.getNodeParameter('labelEntityType', i) as string;
						const entityIds = splitCsv(this.getNodeParameter('labelEntityIds', i) as string);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/labels/remove_entity_ids_from_label_names`, body: { label_names: labelNames, entity_ids: entityIds, entity_type: entityType } });
					}

				// ── Note ───────────────────────────────────────────────────────────
				} else if (resource === 'note') {
					if (operation === 'getAll') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/notes` });
					}

				// ── Field ──────────────────────────────────────────────────────────
				} else if (resource === 'field') {
					if (operation === 'getAll') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/fields` });

					} else if (operation === 'getCustomFields') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/typed_custom_fields` });

					} else if (operation === 'create') {
						const body = buildBody(this.getNodeParameter('fieldCreateFields', i, {}) as IDataObject);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/fields`, body });
					}

				// ── User ───────────────────────────────────────────────────────────
				} else if (resource === 'user') {
					if (operation === 'getProfile') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/users/api_profile` });

					} else if (operation === 'list') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/users/search` });

					} else if (operation === 'listEmailAccounts') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/email_accounts` });
					}

				// ── Analytics ──────────────────────────────────────────────────────
				} else if (resource === 'analytics') {
					if (operation === 'queryReport') {
						const filters = this.getNodeParameter('analyticsFilters', i, {}) as IDataObject;
						const body: IDataObject = {};
						if (filters.start_date) body.start_date = filters.start_date;
						if (filters.end_date) body.end_date = filters.end_date;
						if (filters.user_ids) body.user_ids = splitCsv(filters.user_ids as string);
						if (filters.team_ids) body.team_ids = splitCsv(filters.team_ids as string);
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/reports/sync_report`, body });

					} else if (operation === 'getUsage') {
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'POST', url: `${BASE}/usage_stats/api_usage_stats` });
					}

				// ── Webhook ────────────────────────────────────────────────────────
				} else if (resource === 'webhook') {
					if (operation === 'pollResult') {
						const requestId = this.getNodeParameter('requestId', i) as string;
						responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'apolloApi', { method: 'GET', url: `${BASE}/webhook_result/${requestId}` });
					}

				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, { itemIndex: i });
				}

				if (responseData === undefined) {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${resource}/${operation}`, { itemIndex: i });
				}

				results.push({ json: responseData as IDataObject, pairedItem: { item: i } });

			} catch (error) {
				if (this.continueOnFail()) {
					results.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [results];
	}
}
