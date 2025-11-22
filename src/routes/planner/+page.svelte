<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageProps } from './$types';
	import { format } from 'date-fns';
	import ForecastChart from '$lib/components/ForecastChart.svelte';
	import ForecastTable from '$lib/components/ForecastTable.svelte';

	const { data }: PageProps = $props();

	let messageState = $state<{ success?: boolean; message?: string; error?: string } | null>(null);
	let editingId = $state<number | null>(null);

	const formatCurrency = (value: number) =>
		new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

	const formState = $state({
		name: '',
		amount: 0,
		dayOfMonth: 1
	});

	const editFormState = $state({
		name: '',
		amount: 0,
		dayOfMonth: 1,
		active: true
	});

	const singleExpenseFormState = $state({
		name: '',
		amount: 0,
		date: new Date().toISOString().slice(0, 10)
	});

	let editingSingleId = $state<number | null>(null);
	const editSingleFormState = $state({
		name: '',
		amount: 0,
		date: '',
		active: true
	});

	const startEdit = (expense: (typeof data.expenses)[0]) => {
		editingId = expense.id;
		editFormState.name = expense.name;
		editFormState.amount = expense.amount;
		editFormState.dayOfMonth = expense.dayOfMonth;
		editFormState.active = expense.active;
	};

	const cancelEdit = () => {
		editingId = null;
		editFormState.name = '';
		editFormState.amount = 0;
		editFormState.dayOfMonth = 1;
		editFormState.active = true;
	};

	const startEditSingle = (expense: (typeof data.singleExpenses)[0]) => {
		editingSingleId = expense.id;
		editSingleFormState.name = expense.name;
		editSingleFormState.amount = expense.amount;
		editSingleFormState.date = expense.date.slice(0, 10);
		editSingleFormState.active = expense.active;
	};

	const cancelEditSingle = () => {
		editingSingleId = null;
		editSingleFormState.name = '';
		editSingleFormState.amount = 0;
		editSingleFormState.date = '';
		editSingleFormState.active = true;
	};

	const handleSuccess = () => {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success' && result.data) {
				messageState = result.data as { success?: boolean; message?: string };
				if (result.data.success) {
					await invalidateAll();
					setTimeout(() => {
						messageState = null;
					}, 3000);
					if (editingId) {
						cancelEdit();
					}
					if (editingSingleId) {
						cancelEditSingle();
					}
				}
			} else if (result.type === 'failure' && result.data) {
				messageState = result.data as { error?: string };
				setTimeout(() => {
					messageState = null;
				}, 3000);
			}
		};
	};
</script>

<svelte:head>
	<title>Planer - Finanzcockpit</title>
</svelte:head>

{#if messageState?.success && messageState.message}
	<div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
		{messageState.message}
	</div>
{/if}
{#if messageState?.error}
	<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
		{messageState.error}
	</div>
{/if}

<div class="space-y-8">
	<section>
		<h1 class="text-3xl font-semibold text-gray-900">Finanzplaner</h1>
		<p class="text-sm text-gray-500">
			Verwalte monatliche Ausgaben und erhalte eine Prognose deines Kontostands.
		</p>
	</section>

	<!-- Add Expense Form -->
	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Monatliche Ausgabe hinzufügen</h2>
		<form method="POST" action="?/create" use:enhance={handleSuccess} class="space-y-4">
			<div class="grid gap-4 md:grid-cols-3">
				<div>
					<label class="text-sm font-medium text-gray-700" for="expense-name">Name</label>
					<input
						id="expense-name"
						type="text"
						name="name"
						required
						bind:value={formState.name}
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
						placeholder="z.B. Miete, Strom, Internet"
					/>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700" for="expense-amount"> Betrag (€) </label>
					<input
						id="expense-amount"
						type="number"
						step="0.01"
						min="0"
						name="amount"
						required
						bind:value={formState.amount}
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
						placeholder="0.00"
					/>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700" for="expense-day">
						Tag des Monats
					</label>
					<input
						id="expense-day"
						type="number"
						min="1"
						max="31"
						name="dayOfMonth"
						required
						bind:value={formState.dayOfMonth}
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
						placeholder="1-31"
					/>
				</div>
			</div>
			<button
				type="submit"
				class="rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow hover:bg-primary-600"
			>
				Ausgabe hinzufügen
			</button>
		</form>
	</section>

	<!-- Expenses List -->
	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Monatliche Ausgaben</h2>
		{#if data.expenses.length === 0}
			<p class="text-sm text-gray-500">Noch keine Ausgaben vorhanden.</p>
		{:else}
			<div class="space-y-3">
				{#each data.expenses as expense (expense.id)}
					{#if editingId === expense.id}
						<form
							method="POST"
							action="?/update"
							use:enhance={handleSuccess}
							class="grid gap-3 rounded-xl border-2 border-primary p-4 md:grid-cols-[2fr,1fr,1fr,auto,auto]"
						>
							<input type="hidden" name="id" value={expense.id} />
							<div>
								<input
									type="text"
									name="name"
									required
									bind:value={editFormState.name}
									class="w-full rounded-xl border border-gray-200 px-3 py-2"
								/>
							</div>
							<div>
								<input
									type="number"
									step="0.01"
									min="0"
									name="amount"
									required
									bind:value={editFormState.amount}
									class="w-full rounded-xl border border-gray-200 px-3 py-2"
								/>
							</div>
							<div>
								<input
									type="number"
									min="1"
									max="31"
									name="dayOfMonth"
									required
									bind:value={editFormState.dayOfMonth}
									class="w-full rounded-xl border border-gray-200 px-3 py-2"
								/>
							</div>
							<div class="flex items-center gap-2">
								<input
									type="checkbox"
									name="active"
									bind:checked={editFormState.active}
									class="rounded border-gray-300"
								/>
								<span class="text-sm text-gray-600">Aktiv</span>
							</div>
							<div class="flex gap-2">
								<button
									type="submit"
									class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white"
								>
									Speichern
								</button>
								<button
									type="button"
									onclick={cancelEdit}
									class="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600"
								>
									Abbrechen
								</button>
							</div>
						</form>
					{:else}
						<div
							class="grid items-center gap-3 rounded-xl border border-gray-100 p-4 md:grid-cols-[2fr,1fr,1fr,auto,auto] {expense.active
								? ''
								: 'opacity-50'}"
						>
							<div>
								<p class="font-semibold text-gray-900">{expense.name}</p>
								<p class="text-xs text-gray-500">
									{expense.active ? 'Aktiv' : 'Inaktiv'} · Tag {expense.dayOfMonth}
								</p>
							</div>
							<div>
								<p class="text-sm font-semibold text-gray-900">
									{formatCurrency(expense.amount)}
								</p>
							</div>
							<div>
								<p class="text-sm text-gray-600">Tag {expense.dayOfMonth}</p>
							</div>
							<div>
								{#if expense.active}
									<span class="rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">
										Aktiv
									</span>
								{:else}
									<span class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
										Inaktiv
									</span>
								{/if}
							</div>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={() => startEdit(expense)}
									class="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:text-gray-900"
								>
									Bearbeiten
								</button>
								<form
									method="POST"
									action="?/delete"
									use:enhance={({ cancel }) => {
										if (!confirm('Möchten Sie diese Ausgabe wirklich löschen?')) {
											cancel();
											return;
										}
										return handleSuccess();
									}}
								>
									<input type="hidden" name="id" value={expense.id} />
									<button
										type="submit"
										class="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
									>
										Löschen
									</button>
								</form>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</section>

	<!-- Add Single Expense Form -->
	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Einmalige Ausgabe hinzufügen</h2>
		<form method="POST" action="?/createSingle" use:enhance={handleSuccess} class="space-y-4">
			<div class="grid gap-4 md:grid-cols-3">
				<div>
					<label class="text-sm font-medium text-gray-700" for="single-expense-name"> Name </label>
					<input
						id="single-expense-name"
						type="text"
						name="name"
						required
						bind:value={singleExpenseFormState.name}
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
						placeholder="z.B. Urlaub, Reparatur, Geschenk"
					/>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700" for="single-expense-amount">
						Betrag (€)
					</label>
					<input
						id="single-expense-amount"
						type="number"
						step="0.01"
						min="0"
						name="amount"
						required
						bind:value={singleExpenseFormState.amount}
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
						placeholder="0.00"
					/>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700" for="single-expense-date"> Datum </label>
					<input
						id="single-expense-date"
						type="date"
						name="date"
						required
						bind:value={singleExpenseFormState.date}
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
					/>
				</div>
			</div>
			<button
				type="submit"
				class="rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow hover:bg-primary-600"
			>
				Einmalige Ausgabe hinzufügen
			</button>
		</form>
	</section>

	<!-- Single Expenses List -->
	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Einmalige Ausgaben</h2>
		{#if data.singleExpenses.length === 0}
			<p class="text-sm text-gray-500">Noch keine einmaligen Ausgaben vorhanden.</p>
		{:else}
			<div class="space-y-3">
				{#each data.singleExpenses as expense (expense.id)}
					{#if editingSingleId === expense.id}
						<form
							method="POST"
							action="?/updateSingle"
							use:enhance={handleSuccess}
							class="grid gap-3 rounded-xl border-2 border-primary p-4 md:grid-cols-[2fr,1fr,1fr,auto,auto]"
						>
							<input type="hidden" name="id" value={expense.id} />
							<div>
								<input
									type="text"
									name="name"
									required
									bind:value={editSingleFormState.name}
									class="w-full rounded-xl border border-gray-200 px-3 py-2"
								/>
							</div>
							<div>
								<input
									type="number"
									step="0.01"
									min="0"
									name="amount"
									required
									bind:value={editSingleFormState.amount}
									class="w-full rounded-xl border border-gray-200 px-3 py-2"
								/>
							</div>
							<div>
								<input
									type="date"
									name="date"
									required
									bind:value={editSingleFormState.date}
									class="w-full rounded-xl border border-gray-200 px-3 py-2"
								/>
							</div>
							<div class="flex items-center gap-2">
								<input
									type="checkbox"
									name="active"
									bind:checked={editSingleFormState.active}
									class="rounded border-gray-300"
								/>
								<span class="text-sm text-gray-600">Aktiv</span>
							</div>
							<div class="flex gap-2">
								<button
									type="submit"
									class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white"
								>
									Speichern
								</button>
								<button
									type="button"
									onclick={cancelEditSingle}
									class="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600"
								>
									Abbrechen
								</button>
							</div>
						</form>
					{:else}
						<div
							class="grid items-center gap-3 rounded-xl border border-gray-100 p-4 md:grid-cols-[2fr,1fr,1fr,auto,auto] {expense.active
								? ''
								: 'opacity-50'}"
						>
							<div>
								<p class="font-semibold text-gray-900">{expense.name}</p>
								<p class="text-xs text-gray-500">
									{expense.active ? 'Aktiv' : 'Inaktiv'} · {format(
										new Date(expense.date),
										'dd.MM.yyyy'
									)}
								</p>
							</div>
							<div>
								<p class="text-sm font-semibold text-gray-900">
									{formatCurrency(expense.amount)}
								</p>
							</div>
							<div>
								<p class="text-sm text-gray-600">{format(new Date(expense.date), 'dd.MM.yyyy')}</p>
							</div>
							<div>
								{#if expense.active}
									<span class="rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">
										Aktiv
									</span>
								{:else}
									<span class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
										Inaktiv
									</span>
								{/if}
							</div>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={() => startEditSingle(expense)}
									class="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:text-gray-900"
								>
									Bearbeiten
								</button>
								<form
									method="POST"
									action="?/deleteSingle"
									use:enhance={({ cancel }) => {
										if (!confirm('Möchten Sie diese Ausgabe wirklich löschen?')) {
											cancel();
											return;
										}
										return handleSuccess();
									}}
								>
									<input type="hidden" name="id" value={expense.id} />
									<button
										type="submit"
										class="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
									>
										Löschen
									</button>
								</form>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</section>

	<!-- Forecast -->
	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Prognose (12 Monate)</h2>
		{#if data.forecast.length === 0}
			<p class="text-sm text-gray-500">Keine Prognose verfügbar.</p>
		{:else}
			<!-- Chart -->
			<div class="mb-6">
				<ForecastChart forecast={data.forecast} startingBalance={data.startingBalance} />
				<p class="mt-2 text-center text-xs text-gray-500">
					Die Prognose basiert auf deinen monatlichen Ausgaben, einmaligen Ausgaben und erwarteten
					Einnahmen aus Rechnungen.
				</p>
			</div>

			<!-- Forecast Table -->
			<ForecastTable forecast={data.forecast} />
		{/if}
	</section>

	<!-- Starting Balance -->
	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Startguthaben</h2>
		<form
			method="POST"
			action="?/updateBalance"
			use:enhance={handleSuccess}
			class="flex items-end gap-4"
		>
			<div class="flex-1">
				<label class="text-sm font-medium text-gray-700" for="starting-balance">
					Aktuelles Guthaben
				</label>
				<input
					id="starting-balance"
					type="number"
					step="0.01"
					name="startingBalance"
					value={data.startingBalance}
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
					placeholder="0.00"
				/>
			</div>
			<button
				type="submit"
				class="rounded-full bg-primary px-6 py-2 text-base font-semibold text-white shadow hover:bg-primary-600"
			>
				Speichern
			</button>
		</form>
	</section>
</div>
