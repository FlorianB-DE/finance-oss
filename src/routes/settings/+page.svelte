<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import Message from '$lib/components/Message.svelte';

	const { data } = $props<{ data: PageData; form?: ActionData }>();

	let formState = $state<{ success?: boolean; error?: string } | null>(data.form ?? null);

	type SettingsField =
		| 'personName'
		| 'companyName'
		| 'legalStatus'
		| 'defaultTaxRate'
		| 'taxNumber'
		| 'wirtschaftsIdentNr'
		| 'street'
		| 'postalCode'
		| 'city'
		| 'country'
		| 'iban'
		| 'bic'
		| 'invoicePrefix'
		| 'overrideInvoiceStartNumber';

	const fields: Array<{
		name: SettingsField;
		label: string;
		type?: string;
		step?: string;
	}> = [
		{ name: 'personName', label: 'Name' },
		{ name: 'companyName', label: 'Firma' },
		{ name: 'legalStatus', label: 'Rechtsform' },
		{ name: 'defaultTaxRate', label: 'Standard-Steuersatz (%)', type: 'number', step: '0.1' },
		{ name: 'taxNumber', label: 'Steuernummer' },
		{ name: 'wirtschaftsIdentNr', label: 'Wirtschafts-ID' },
		{ name: 'street', label: 'Straße' },
		{ name: 'postalCode', label: 'PLZ' },
		{ name: 'city', label: 'Stadt' },
		{ name: 'country', label: 'Land' },
		{ name: 'iban', label: 'IBAN' },
		{ name: 'bic', label: 'BIC' },
		{ name: 'invoicePrefix', label: 'Rechnungspräfix' },
		{
			name: 'overrideInvoiceStartNumber',
			label: 'Rechnungs-Nr. Startwert (0 = automatisch)',
			type: 'number',
			step: '1'
		}
	];

	const asInputValue = (value: unknown) => {
		if (value === undefined || value === null) return '';
		return value.toString();
	};
</script>

<svelte:head>
	<title>Einstellungen - Finanzcockpit</title>
</svelte:head>

<form
	method="POST"
	action="?/save"
	use:enhance={() => {
		return async ({ result }) => {
			if (result.type === 'success' && result.data) {
				formState = result.data as { success?: boolean; error?: string };
				if (result.data.success) {
					// Refresh data and show success message
					await invalidateAll();
				}
			} else if (result.type === 'failure' && result.data) {
				formState = result.data as { success?: boolean; error?: string };
			}
		};
	}}
	class="space-y-8"
>
	{#if formState?.success}
		<Message type="success" message="Einstellungen erfolgreich gespeichert!" />
	{/if}
	{#if formState?.error}
		<Message type="error" message={formState.error} />
	{/if}
	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h1 class="text-2xl font-semibold text-gray-900">Unternehmensdaten</h1>
		<div class="mt-6 grid gap-4 md:grid-cols-2">
			{#each fields as field (field.name)}
				<div>
					<label class="text-sm font-medium text-gray-700" for={`settings-${field.name}`}>
						{field.label}
					</label>
					<input
						id={`settings-${field.name}`}
						name={field.name}
						step={field.step}
						type={field.type ?? 'text'}
						value={asInputValue(data.settings?.[field.name])}
						class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
					/>
				</div>
			{/each}
		</div>
	</section>

	<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="text-xl font-semibold text-gray-900">E-Mail Versand (Beta)</h2>
		<div class="mt-6 grid gap-4 md:grid-cols-2">
			<div>
				<label class="text-sm font-medium text-gray-700" for="settings-email-from"
					>Absender-Adresse</label
				>
				<input
					id="settings-email-from"
					name="emailFrom"
					type="email"
					value={data.settings.emailFrom ?? ''}
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
				/>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700" for="settings-smtp-host">SMTP Host</label>
				<input
					id="settings-smtp-host"
					name="smtpHost"
					value={data.settings.smtpHost ?? ''}
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
				/>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700" for="settings-smtp-port">SMTP Port</label>
				<input
					id="settings-smtp-port"
					name="smtpPort"
					type="number"
					value={data.settings.smtpPort ?? ''}
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
				/>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700" for="settings-smtp-user"
					>SMTP Benutzer</label
				>
				<input
					id="settings-smtp-user"
					name="smtpUser"
					value={data.settings.smtpUser ?? ''}
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
				/>
			</div>
			<div>
				<label class="text-sm font-medium text-gray-700" for="settings-smtp-password">
					SMTP Passwort
				</label>
				<input
					id="settings-smtp-password"
					name="smtpPassword"
					type="password"
					value={data.settings.smtpPassword ?? ''}
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
				/>
			</div>
			<div class="md:col-span-2">
				<label class="text-sm font-medium text-gray-700" for="settings-email-signature">
					E-Mail Text
				</label>
				<textarea
					id="settings-email-signature"
					name="emailSignature"
					rows="3"
					class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
					>{data.settings.emailSignature ?? ''}</textarea
				>
			</div>
		</div>
	</section>

	<button
		class="rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow hover:bg-primary-600"
	>
		Speichern
	</button>
</form>
