<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import Message from '$lib/components/Message.svelte';

	const { data } = $props<{ data: PageData }>();

	let messageState = $state<{ success?: boolean; message?: string; error?: string } | null>(null);

	type DraftItem = {
		description: string;
		quantity: number;
		unitPrice: number;
		taxRate: number;
	};

	const defaultTaxRate =
		data.settings?.defaultTaxRate !== null && data.settings?.defaultTaxRate !== undefined
			? Number(data.settings.defaultTaxRate)
			: 19;

	const formState = $state({
		recipientId: data.recipients[0]?.id ?? '',
		issueDate: new Date().toISOString().slice(0, 10),
		dueDate: '',
		notes: ''
	});

	let items = $state<DraftItem[]>([
		{ description: '', quantity: 1, unitPrice: 0, taxRate: Number(defaultTaxRate) }
	]);

	const addItem = () => {
		items = [
			...items,
			{ description: '', quantity: 1, unitPrice: 0, taxRate: Number(defaultTaxRate) }
		];
	};

	const removeItem = (index: number) => {
		if (items.length === 1) return;
		items = items.filter((_, i) => i !== index);
	};

	const totals = $derived(() =>
		items.reduce(
			(acc, item) => {
				const net = item.quantity * item.unitPrice;
				const tax = net * (item.taxRate / 100);
				return {
					net: acc.net + net,
					tax: acc.tax + tax,
					gross: acc.gross + net + tax
				};
			},
			{ net: 0, tax: 0, gross: 0 }
		)
	);

	const submitInvoice = async (event: SubmitEvent) => {
		event.preventDefault();
		const payload = {
			...formState,
			recipientId: Number(formState.recipientId),
			items: items.map(item => ({
				description: item.description,
				quantity: Number(item.quantity),
				unitPrice: Number(item.unitPrice),
				taxRate: Number(item.taxRate)
			}))
		};

		const formData = new FormData();
		formData.set('payload', JSON.stringify(payload));
		await fetch('?/create', { method: 'POST', body: formData });
		location.reload();
	};

	const formatCurrency = (value: number) =>
		new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
</script>

<svelte:head>
	<title>Rechnungen - Finanzcockpit</title>
</svelte:head>

{#if messageState?.success && messageState.message}
	<Message type="success" message={messageState.message} />
{/if}
{#if messageState?.error}
	<Message type="error" message={messageState.error} />
{/if}

<div class="grid gap-8 lg:grid-cols-[2fr,1fr]">
	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<header class="mb-6">
			<h1 class="text-2xl font-semibold text-gray-900">Neue Rechnung</h1>
			<p class="text-sm text-gray-500">Leg deine Positionen fest.</p>
		</header>

		<form class="space-y-6" onsubmit={submitInvoice}>
			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label class="text-sm font-medium text-gray-700" for="invoice-recipient">Empfänger</label>
					<select
						id="invoice-recipient"
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
						bind:value={formState.recipientId}
					>
						{#each data.recipients as recipient (recipient.id)}
							<option value={recipient.id}>{recipient.name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700" for="invoice-issue-date">
						Leistungsdatum
					</label>
					<input
						id="invoice-issue-date"
						type="date"
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
						bind:value={formState.issueDate}
					/>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700" for="invoice-due-date">
						Fällig bis
					</label>
					<input
						id="invoice-due-date"
						type="date"
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
						bind:value={formState.dueDate}
					/>
				</div>
			</div>

			<div class="space-y-4">
				{#each items as item, index (index)}
					<div
						class="grid gap-3 rounded-2xl border border-gray-100 p-4 md:grid-cols-[2fr,repeat(3,1fr),auto]"
					>
						<div class="md:col-span-1">
							<label class="text-xs font-medium text-gray-500" for={`item-${index}-desc`}>
								Beschreibung
							</label>
							<input
								id={`item-${index}-desc`}
								class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
								placeholder="Position"
								bind:value={item.description}
							/>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-500" for={`item-${index}-qty`}>
								Menge
							</label>
							<input
								id={`item-${index}-qty`}
								type="number"
								step="0.1"
								min="0"
								class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
								bind:value={item.quantity}
							/>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-500" for={`item-${index}-price`}>
								Einzelpreis
							</label>
							<input
								id={`item-${index}-price`}
								type="number"
								step="0.01"
								min="0"
								class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
								bind:value={item.unitPrice}
							/>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-500" for={`item-${index}-tax`}>
								Steuer %
							</label>
							<input
								id={`item-${index}-tax`}
								type="number"
								step="0.1"
								min="0"
								class="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
								bind:value={item.taxRate}
							/>
						</div>
						<button
							type="button"
							class="self-end rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:text-gray-900"
							onclick={() => removeItem(index)}
						>
							Entfernen
						</button>
					</div>
				{/each}
				<button
					type="button"
					onclick={addItem}
					class="rounded-full border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400"
				>
					Position hinzufügen
				</button>
			</div>

			<div>
				<label class="text-sm font-medium text-gray-700" for="invoice-notes">Notiz</label>
				<textarea
					id="invoice-notes"
					rows="3"
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
					bind:value={formState.notes}
				></textarea>
			</div>

			<div class="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
				<div>
					<p class="text-sm text-gray-500">Gesamt</p>
					<p class="text-2xl font-semibold text-gray-900">{formatCurrency(totals().gross)}</p>
					<p class="text-xs text-gray-500">
						Netto {formatCurrency(totals().net)} · Steuer {formatCurrency(totals().tax)}
					</p>
				</div>
				<button
					class="rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow hover:bg-primary-600"
				>
					Rechnung erzeugen
				</button>
			</div>
		</form>
	</section>

	<section class="space-y-4">
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="text-xl font-semibold text-gray-900">Bestehende Rechnungen</h2>
			<div class="mt-4 space-y-4">
				{#if data.invoices.length === 0}
					<p class="text-sm text-gray-500">Noch keine Rechnungen vorhanden.</p>
				{:else}
					{#each data.invoices as invoice (invoice.id)}
						<div class="rounded-xl border border-gray-100 p-4">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-semibold text-gray-900">{invoice.number}</p>
									<p class="text-xs text-gray-500">
										{invoice.recipient?.name ?? invoice.recipient?.company}
									</p>
								</div>
								<span class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 uppercase"
									>{invoice.status}</span
								>
							</div>
							<p class="mt-2 text-sm font-semibold">{formatCurrency(Number(invoice.totalGross))}</p>
							<div class="mt-3 flex flex-wrap gap-2 text-xs">
								{#if invoice.pdfPath}
									<a
										class="rounded-full border border-gray-200 px-3 py-1 text-gray-600 hover:text-gray-900"
										href={resolve(`/invoices/${invoice.number}/download`)}
										target="_blank"
										rel="noopener noreferrer"
									>
										PDF öffnen
									</a>
								{/if}
								<form
									method="POST"
									action="?/regenerate"
									use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success' && result.data) {
												messageState = result.data as { success?: boolean; message?: string };
												if (result.data.success) {
													await invalidateAll();
													setTimeout(() => {
														messageState = null;
													}, 3000);
												}
											} else if (result.type === 'failure' && result.data) {
												messageState = result.data as { error?: string };
												setTimeout(() => {
													messageState = null;
												}, 3000);
											}
										};
									}}
								>
									<input type="hidden" name="invoiceId" value={invoice.id} />
									<button class="rounded-full border border-gray-200 px-3 py-1 text-gray-600">
										ZUGFeRD neu
									</button>
								</form>
								<form
									method="POST"
									action="?/send"
									use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success' && result.data) {
												messageState = result.data as { success?: boolean; message?: string };
												if (result.data.success) {
													await invalidateAll();
													setTimeout(() => {
														messageState = null;
													}, 3000);
												}
											} else if (result.type === 'failure' && result.data) {
												messageState = result.data as { error?: string };
												setTimeout(() => {
													messageState = null;
												}, 3000);
											}
										};
									}}
								>
									<input type="hidden" name="invoiceId" value={invoice.id} />
									<button class="rounded-full border border-gray-200 px-3 py-1 text-gray-600">
										Senden
									</button>
								</form>
								<form
									method="POST"
									action="?/status"
									use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success' && result.data) {
												messageState = result.data as { success?: boolean; message?: string };
												if (result.data.success) {
													await invalidateAll();
													setTimeout(() => {
														messageState = null;
													}, 3000);
												}
											} else if (result.type === 'failure' && result.data) {
												messageState = result.data as { error?: string };
												setTimeout(() => {
													messageState = null;
												}, 3000);
											}
										};
									}}
								>
									<input type="hidden" name="invoiceId" value={invoice.id} />
									<select
										id={`invoice-status-${invoice.id}`}
										name="status"
										class="rounded-full border border-gray-200 px-3 py-1 text-gray-600"
										value={invoice.status}
									>
										<option value="DRAFT">Entwurf</option>
										<option value="SENT">Versandt</option>
										<option value="PAID">Bezahlt</option>
										<option value="CANCELLED">Storniert</option>
									</select>
									<button class="rounded-full border border-gray-200 px-3 py-1 text-gray-600">
										Update
									</button>
								</form>
								<form
									method="POST"
									action="?/delete"
									use:enhance={({ cancel }) => {
										if (
											!confirm(
												'Möchten Sie diese Rechnung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
											)
										) {
											cancel();
											return;
										}
										return async ({ result }) => {
											if (result.type === 'success' && result.data) {
												messageState = result.data as { success?: boolean; message?: string };
												if (result.data.success) {
													await invalidateAll();
													setTimeout(() => {
														messageState = null;
													}, 3000);
												}
											} else if (result.type === 'failure' && result.data) {
												messageState = result.data as { error?: string };
												setTimeout(() => {
													messageState = null;
												}, 3000);
											}
										};
									}}
								>
									<input type="hidden" name="invoiceId" value={invoice.id} />
									<button
										type="submit"
										class="rounded-full border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
									>
										Löschen
									</button>
								</form>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</section>
</div>
