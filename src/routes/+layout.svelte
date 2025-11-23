<script lang="ts">
	import '$lib/layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navigation from '$lib/components/Navigation.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if !data.user}
	{@render children()}
{:else}
	<div class="flex min-h-screen flex-col bg-surface">
		<Navigation userEmail={data.user.email} />
		<main class="mx-auto max-w-6xl flex-1 px-4 py-8">
			{@render children()}
		</main>
		<Footer />
	</div>
{/if}
