<script lang="ts">
	import type { PageData } from './$types';

	const { data } = $props<{ data: PageData }>();

	const formatCurrency = (value: number) =>
		new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

	const defaultTaxRate =
		data.settings?.defaultTaxRate !== null && data.settings?.defaultTaxRate !== undefined
			? Number(data.settings.defaultTaxRate)
			: 19;
</script>

<svelte:head>
	<title>Übersicht - Finanzcockpit</title>
</svelte:head>

<div class="space-y-8">
	<section>
		<h1 class="text-3xl font-semibold text-gray-900">Übersicht</h1>
		<p class="text-sm text-gray-500">Verwalte Rechnungen und Stammdaten zentral.</p>
	</section>

	<section class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<p class="text-sm text-gray-500">Rechnungen gesamt</p>
			<p class="mt-2 text-3xl font-semibold text-gray-900">{data.stats.count}</p>
		</div>
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<p class="text-sm text-gray-500">Gesamtbetrag</p>
			<p class="mt-2 text-3xl font-semibold text-gray-900">
				{formatCurrency(data.stats.gross)}
			</p>
		</div>
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<p class="text-sm text-gray-500">Standardsteuer</p>
			<p class="mt-2 text-3xl font-semibold text-gray-900">
				{defaultTaxRate} %
			</p>
		</div>
	</section>

	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h2 class="text-xl font-semibold text-gray-900">Letzte Rechnungen</h2>
				<p class="text-sm text-gray-500">Status deiner aktuellen Vorgänge</p>
			</div>
			<a
				class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-600"
				href="/invoices">Neue Rechnung</a
			>
		</div>
		<div class="space-y-3">
			{#if data.invoices.length === 0}
				<p class="text-sm text-gray-500">Noch keine Rechnungen.</p>
			{:else}
				{#each data.invoices as invoice}
					<div
						class="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
					>
						<div>
							<p class="text-sm font-semibold text-gray-900">{invoice.number}</p>
							<p class="text-xs text-gray-500">
								{invoice.recipient?.name ?? invoice.recipient?.company}
							</p>
						</div>
						<div class="text-right">
							<p class="text-sm font-semibold">
								{formatCurrency(Number(invoice.totalGross))}
							</p>
							<p class="text-xs text-gray-500">{invoice.status}</p>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>
</div>
