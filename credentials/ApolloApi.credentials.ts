import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ApolloApi implements ICredentialType {
	name = 'apolloApi';
	displayName = 'Apollo API';
	documentationUrl = 'https://docs.apollo.io/reference/authentication';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Apollo.io API key. Find it at apollo.io → Settings → Integrations → API.',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Api-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.apollo.io/api/v1',
			url: '/users/api_profile',
			method: 'GET',
		},
	};
}
