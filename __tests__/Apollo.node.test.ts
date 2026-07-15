import { Apollo } from '../nodes/Apollo/Apollo.node';

describe('Apollo Node', () => {
	let node: Apollo;

	beforeEach(() => {
		node = new Apollo();
	});

	describe('description', () => {
		it('has the correct name', () => {
			expect(node.description.name).toBe('apollo');
		});

		it('has credentials defined', () => {
			expect(node.description.credentials).toHaveLength(1);
			expect(node.description.credentials![0].name).toBe('apolloApi');
		});

		it('has all expected resources', () => {
			const resourceProp = node.description.properties.find(p => p.name === 'resource');
			expect(resourceProp).toBeDefined();
			const options = (resourceProp!.options as Array<{ value: string }>).map(o => o.value);
			const expected = ['account', 'analytics', 'call', 'contact', 'conversation', 'deal', 'email', 'field', 'label', 'note', 'organization', 'person', 'sequence', 'task', 'user', 'webhook'];
			expected.forEach(r => expect(options).toContain(r));
		});

		it('has operations for every resource', () => {
			const resourceProp = node.description.properties.find(p => p.name === 'resource');
			const resources = (resourceProp!.options as Array<{ value: string }>).map(o => o.value).filter(v => v !== '__CUSTOM_API_CALL__');
			const operationProps = node.description.properties.filter(p => p.name === 'operation');

			resources.forEach(resource => {
				const hasOps = operationProps.some(op =>
					op.displayOptions?.show?.resource?.includes(resource)
				);
				expect(hasOps).toBe(true);
			});
		});

		it('has more than 50 total operations', () => {
			const operationProps = node.description.properties.filter(p => p.name === 'operation');
			const total = operationProps.reduce((sum, op) => sum + ((op.options as unknown[]) || []).length, 0);
			expect(total).toBeGreaterThan(50);
		});

		it('has inputs and outputs', () => {
			expect(node.description.inputs).toContain('main');
			expect(node.description.outputs).toContain('main');
		});
	});
});
