<script lang="ts">
	type MessageType = 'success' | 'error' | 'info';

	let { type, message }: { type: MessageType; message: string } = $props();
</script>

{#if type === 'success'}
	<div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
		{message}
	</div>
{:else if type === 'error'}
	<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
		{message}
	</div>
{:else}
	<div class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
		{message}
	</div>
{/if}

