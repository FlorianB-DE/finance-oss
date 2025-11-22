<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import { format } from 'date-fns';

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

	<!-- Forecast Chart (smaller) -->
	{#if data.forecast && data.forecast.length > 0}
		<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Finanzprognose</h2>
					<p class="text-sm text-gray-500">12-Monats-Vorschau deines Kontostands</p>
				</div>
				<a
					class="text-sm font-medium text-primary hover:text-primary-600"
					href={resolve('/planner')}>Details anzeigen</a
				>
			</div>

			{#await import('$lib/components/ForecastChart.svelte')}
				<div class="flex h-[250px] items-center justify-center text-sm text-gray-500">
					Lade Diagramm...
				</div>
			{:then { default: ForecastChart }}
				<ForecastChart
					forecast={data.forecast}
					startingBalance={data.startingBalance}
					height={250}
				/>
			{/await}
		</section>
	{/if}

	<!-- Recent Transactions -->
	{#if data.recentTransactions && data.recentTransactions.length > 0}
		<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<div class="mb-4">
				<h2 class="text-xl font-semibold text-gray-900">Letzte Transaktionen</h2>
				<p class="text-sm text-gray-500">Einnahmen und Ausgaben der letzten Zeit</p>
			</div>
			<div class="space-y-3">
				{#each data.recentTransactions as transaction (transaction.date + transaction.description)}
					<div
						class="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
					>
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span
									class={`inline-flex h-2 w-2 rounded-full ${
										transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
									}`}
								></span>
								<p class="text-sm font-semibold text-gray-900">
									{transaction.description}
								</p>
							</div>
							<p class="mt-1 text-xs text-gray-500">
								{format(new Date(transaction.date), 'dd.MM.yyyy')}
								{#if transaction.type === 'income' && 'recipient' in transaction && transaction.recipient}
									· {transaction.recipient}
								{/if}
							</p>
						</div>
						<div class="text-right">
							<p
								class={`text-sm font-semibold ${
									transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
								}`}
							>
								{transaction.type === 'income' ? '+' : '-'}
								{formatCurrency(transaction.amount)}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Paid Invoices -->
	{#if data.paidInvoices && data.paidInvoices.length > 0}
		<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Bezahlte Rechnungen</h2>
					<p class="text-sm text-gray-500">Zuletzt bezahlte Rechnungen</p>
				</div>
				<a
					class="text-sm font-medium text-primary hover:text-primary-600"
					href={resolve('/invoices')}>Alle anzeigen</a
				>
			</div>
			<div class="space-y-3">
				{#each data.paidInvoices as invoice (invoice.id)}
					<div
						class="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
					>
						<div>
							<p class="text-sm font-semibold text-gray-900">{invoice.number}</p>
							<p class="text-xs text-gray-500">
								{invoice.recipient?.name ?? invoice.recipient?.company} · {format(
									new Date(invoice.dueDate),
									'dd.MM.yyyy'
								)}
							</p>
						</div>
						<div class="text-right">
							<p class="text-sm font-semibold text-green-600">
								{formatCurrency(Number(invoice.totalGross))}
							</p>
							<p class="text-xs text-gray-500">Bezahlt</p>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Sent Invoices (Not Paid Yet) -->
	{#if data.sentInvoices && data.sentInvoices.length > 0}
		<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Versendete Rechnungen</h2>
					<p class="text-sm text-gray-500">Ausstehende Zahlungen</p>
				</div>
				<a
					class="text-sm font-medium text-primary hover:text-primary-600"
					href={resolve('/invoices')}>Alle anzeigen</a
				>
			</div>
			<div class="space-y-3">
				{#each data.sentInvoices as invoice (invoice.id)}
					<div
						class="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
					>
						<div>
							<p class="text-sm font-semibold text-gray-900">{invoice.number}</p>
							<p class="text-xs text-gray-500">
								{invoice.recipient?.name ?? invoice.recipient?.company} · Fällig: {format(
									new Date(invoice.dueDate),
									'dd.MM.yyyy'
								)}
							</p>
						</div>
						<div class="text-right">
							<p class="text-sm font-semibold text-amber-600">
								{formatCurrency(Number(invoice.totalGross))}
							</p>
							<p class="text-xs text-gray-500">Ausstehend</p>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Draft Invoices -->
	{#if data.draftInvoices && data.draftInvoices.length > 0}
		<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Entwürfe</h2>
					<p class="text-sm text-gray-500">Noch nicht versendete Rechnungen</p>
				</div>
				<a
					class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-600"
					href={resolve('/invoices')}>Neue Rechnung</a
				>
			</div>
			<div class="space-y-3">
				{#each data.draftInvoices as invoice (invoice.id)}
					<div
						class="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
					>
						<div>
							<p class="text-sm font-semibold text-gray-900">{invoice.number}</p>
							<p class="text-xs text-gray-500">
								{invoice.recipient?.name ?? invoice.recipient?.company} · {format(
									new Date(invoice.issueDate),
									'dd.MM.yyyy'
								)}
							</p>
						</div>
						<div class="text-right">
							<p class="text-sm font-semibold">
								{formatCurrency(Number(invoice.totalGross))}
							</p>
							<p class="text-xs text-gray-500">Entwurf</p>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>
