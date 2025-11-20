<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import Message from '$lib/components/Message.svelte';
	import countries from '$lib/data/countries.json';

	const { data } = $props<{ data: PageData }>();

	type CountryOption = { code: string; name: string };
	const countryOptions = countries as CountryOption[];

	const normalizeCountry = (value: string) => value.trim().slice(0, 2).toUpperCase();

	let countryValue = $state('DE');
	let messageState = $state<{ success?: boolean; message?: string; error?: string } | null>(null);
</script>

<svelte:head>
	<title>Empfänger - Finanzcockpit</title>
</svelte:head>

{#if messageState?.success && messageState.message}
	<Message type="success" message={messageState.message} />
{/if}
{#if messageState?.error}
	<Message type="error" message={messageState.error} />
{/if}

<div class="grid gap-8 lg:grid-cols-3">
	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
		<header class="mb-4">
			<h1 class="text-2xl font-semibold text-gray-900">Empfänger</h1>
			<p class="text-sm text-gray-500">Verfügbare Kunden & Ansprechpartner.</p>
		</header>

		{#if data.recipients.length === 0}
			<p class="text-sm text-gray-500">Noch keine Empfänger.</p>
		{:else}
			<ul class="divide-y divide-gray-100">
				{#each data.recipients as recipient (recipient.id)}
					<li class="flex items-center justify-between py-4">
						<div>
							<p class="text-base font-semibold text-gray-900">{recipient.name}</p>
							<p class="text-sm text-gray-500">
								{recipient.company ?? '—'} · {recipient.email ?? 'keine E-Mail'}
							</p>
						</div>
						<form
							method="POST"
							action="?/delete"
							use:enhance={({ cancel }) => {
								if (
									!confirm(
										'Möchten Sie diesen Empfänger wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
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
							<input type="hidden" name="recipientId" value={recipient.id} />
							<button
								type="submit"
								class="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
							>
								Löschen
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="text-xl font-semibold text-gray-900">Neuer Empfänger</h2>
		<form method="POST" action="?/create" use:enhance class="mt-4 space-y-4">
			<div>
				<label class="text-sm font-medium text-gray-700" for="recipient-name">Name*</label>
				<input
					id="recipient-name"
					name="name"
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
					required
				/>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700" for="recipient-company">Firma</label>
				<input
					id="recipient-company"
					name="company"
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
				/>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700" for="recipient-email">E-Mail</label>
				<input
					id="recipient-email"
					name="email"
					type="email"
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
				/>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700" for="recipient-street">Straße</label>
				<input
					id="recipient-street"
					name="street"
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
				/>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="text-sm font-medium text-gray-700" for="recipient-postal">PLZ</label>
					<input
						id="recipient-postal"
						name="postalCode"
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
					/>
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700" for="recipient-city">Stadt</label>
					<input
						id="recipient-city"
						name="city"
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
					/>
				</div>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700" for="recipient-country">
					Land* (ISO-2)
				</label>
				<input
					id="recipient-country"
					name="country"
					list="country-options"
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 uppercase"
					required
					minlength="2"
					maxlength="2"
					bind:value={countryValue}
					oninput={event => {
						countryValue = normalizeCountry(event.currentTarget.value);
					}}
				/>
				<datalist id="country-options">
					{#each countryOptions as option (option.code)}
						<option value={option.code}>
							{option.name} ({option.code})
						</option>
					{/each}
				</datalist>
			</div>
			<button
				class="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
			>
				Speichern
			</button>
		</form>
	</section>
</div>
