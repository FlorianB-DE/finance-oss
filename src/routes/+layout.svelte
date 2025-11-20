<script lang="ts">
	import '$lib/layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { children, data } = $props();

	const navigation = [
		{ href: '/', label: 'Übersicht' },
		{ href: '/invoices', label: 'Rechnungen' },
		{ href: '/recipients', label: 'Empfänger' },
		{ href: '/settings', label: 'Einstellungen' }
	] as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if !data.user}
	{@render children()}
{:else}
	<div class="min-h-screen bg-surface">
		<header class="border-b border-gray-200 bg-white/90 backdrop-blur">
			<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary font-semibold text-white"
					>
						F
					</div>
					<div>
						<p class="text-base font-semibold text-gray-900">Finanzcockpit</p>
						<p class="text-xs text-gray-500">ZUGFeRD Rechnungen</p>
					</div>
				</div>
				<nav class="flex gap-6 text-sm font-medium text-gray-500">
					{#each navigation as item (item.href)}
						<a
							href={resolve(item.href)}
							class={`transition hover:text-gray-900 ${
								page.url.pathname === item.href ||
								(page.url.pathname.startsWith(item.href) && item.href !== '/')
									? 'text-gray-900'
									: ''
							}`}>{item.label}</a
						>
					{/each}
				</nav>
				<form method="POST" action="/logout" class="flex items-center gap-4">
					<span class="text-sm text-gray-600">{data.user.email}</span>
					<button
						class="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
					>
						Abmelden
					</button>
				</form>
			</div>
		</header>
		<main class="mx-auto max-w-6xl px-4 py-8">
			{@render children()}
		</main>
	</div>
{/if}
