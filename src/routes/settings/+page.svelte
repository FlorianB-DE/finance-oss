<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import Message from '$lib/components/Message.svelte';

	const { data } = $props<{ data: PageData; form?: ActionData }>();

	let formState = $state<{ success?: boolean; error?: string } | null>(data.form ?? null);
	let activeTab = $state<'general' | 'templates'>('general');
	let templateFeedback = $state<{
		templateSuccess?: boolean;
		templateMessage?: string;
		templateError?: string;
	} | null>(null);

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

	const applyTemplateResult = async (result: { type: string; data?: Record<string, unknown> }) => {
		if (result.type === 'success' && result.data) {
			templateFeedback = result.data as typeof templateFeedback;
			await invalidateAll();
		} else if (result.type === 'failure' && result.data) {
			templateFeedback = result.data as typeof templateFeedback;
		}
	};

	const templateEnhance = () => {
		return async ({ result }: { result: { type: string; data?: Record<string, unknown> } }) => {
			await applyTemplateResult(result);
		};
	};
</script>

<svelte:head>
	<title>Einstellungen - Finanzcockpit</title>
</svelte:head>

<div class="space-y-6">
	<nav class="flex gap-1 border-b border-gray-200" aria-label="Einstellungen">
		<button
			type="button"
			class="-mb-px rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors"
			class:border-gray-200={activeTab === 'general'}
			class:bg-white={activeTab === 'general'}
			class:text-gray-900={activeTab === 'general'}
			class:border-transparent={activeTab !== 'general'}
			class:text-gray-500={activeTab !== 'general'}
			class:hover:text-gray-800={activeTab !== 'general'}
			onclick={() => (activeTab = 'general')}
		>
			Allgemein
		</button>
		<button
			type="button"
			class="-mb-px rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors"
			class:border-gray-200={activeTab === 'templates'}
			class:bg-white={activeTab === 'templates'}
			class:text-gray-900={activeTab === 'templates'}
			class:border-transparent={activeTab !== 'templates'}
			class:text-gray-500={activeTab !== 'templates'}
			class:hover:text-gray-800={activeTab !== 'templates'}
			onclick={() => (activeTab = 'templates')}
		>
			PDF-Vorlagen
		</button>
	</nav>

	{#if activeTab === 'general'}
		<form
			method="POST"
			action="?/save"
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success' && result.data) {
						formState = result.data as { success?: boolean; error?: string };
						if (result.data.success) {
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
						<label class="text-sm font-medium text-gray-700" for="settings-smtp-host"
							>SMTP Host</label
						>
						<input
							id="settings-smtp-host"
							name="smtpHost"
							value={data.settings.smtpHost ?? ''}
							class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2"
						/>
					</div>
					<div>
						<label class="text-sm font-medium text-gray-700" for="settings-smtp-port"
							>SMTP Port</label
						>
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
	{:else}
		<div class="space-y-8">
			{#if templateFeedback?.templateSuccess && templateFeedback.templateMessage}
				<Message type="success" message={templateFeedback.templateMessage} />
			{/if}
			{#if templateFeedback?.templateError}
				<Message type="error" message={templateFeedback.templateError} />
			{/if}

			<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<h2 class="text-xl font-semibold text-gray-900">Rechnungs-PDF einbinden</h2>
				<p class="mt-2 text-sm text-gray-600">
					Vorlagen liegen im Ordner <code class="rounded bg-gray-100 px-1.5 py-0.5 text-xs"
						>templates</code
					>
					neben Ihren Rechnungsdateien (siehe
					<code class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">FILES_DIR</code> in der Konfiguration
					— gleiches Muster wie bei der Rechnungsablage).
				</p>
				<p class="mt-2 text-sm text-gray-600">
					Laden Sie eine HTML-Datei hoch, die genau den Platzhalter
					<code class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{'{{INVOICE_BODY}}'}</code>
					enthält. Dort wird der Rechnungsinhalt eingefügt. Sie können z. B. Briefkopf und eigenes Layout
					um die Rechnung herum definieren.
				</p>

				<form
					method="POST"
					action="?/uploadTemplate"
					enctype="multipart/form-data"
					use:enhance={templateEnhance}
					class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
				>
					<div class="min-w-0 flex-1">
						<label class="text-sm font-medium text-gray-700" for="template-upload"
							>HTML-Vorlage hochladen</label
						>
						<input
							id="template-upload"
							name="template"
							type="file"
							accept=".html,.htm,text/html"
							class="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-600"
						/>
					</div>
					<button
						type="submit"
						class="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow hover:bg-primary-600"
					>
						Hochladen
					</button>
				</form>
			</section>

			<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<h2 class="text-xl font-semibold text-gray-900">Aktive Vorlage</h2>
				<p class="mt-1 text-sm text-gray-500">
					{#if data.settings.invoiceTemplatePath}
						Aktuell: <span class="font-medium text-gray-800"
							>{data.settings.invoiceTemplatePath}</span
						>
					{:else}
						Standard-Layout der Anwendung (eingebaute Svelte-Vorlage).
					{/if}
				</p>

				<form method="POST" action="?/selectTemplate" use:enhance={templateEnhance} class="mt-6">
					<fieldset class="space-y-3">
						<legend class="sr-only">Vorlage wählen</legend>
						<label
							class="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50"
						>
							<input
								type="radio"
								name="invoiceTemplatePath"
								value=""
								checked={!data.settings.invoiceTemplatePath}
								class="h-4 w-4 border-gray-300 text-primary"
							/>
							<span class="text-sm text-gray-800">Standard (eingebaut)</span>
						</label>
						{#each data.templateFiles as name (name)}
							<label
								class="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50"
							>
								<input
									type="radio"
									name="invoiceTemplatePath"
									value={name}
									checked={data.settings.invoiceTemplatePath === name}
									class="h-4 w-4 border-gray-300 text-primary"
								/>
								<span class="text-sm text-gray-800">{name}</span>
							</label>
						{/each}
					</fieldset>
					{#if data.templateFiles.length === 0}
						<p class="mt-4 text-sm text-gray-500">Noch keine Vorlagen hochgeladen.</p>
					{/if}
					<button
						type="submit"
						class="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow hover:bg-primary-600"
					>
						Auswahl speichern
					</button>
				</form>
			</section>

			{#if data.templateFiles.length > 0}
				<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
					<h2 class="text-xl font-semibold text-gray-900">Vorlagen verwalten</h2>
					<ul class="mt-4 divide-y divide-gray-100">
						{#each data.templateFiles as name (name)}
							<li class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
								<span class="text-sm font-medium text-gray-800">{name}</span>
								<form
									method="POST"
									action="?/deleteTemplate"
									use:enhance={({ cancel }) => {
										if (!confirm(`Vorlage „${name}“ wirklich löschen?`)) {
											cancel();
											return;
										}
										return async ({ result }) => {
											await applyTemplateResult(result);
										};
									}}
								>
									<input type="hidden" name="filename" value={name} />
									<button
										type="submit"
										class="rounded-full border border-red-200 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50"
									>
										Löschen
									</button>
								</form>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}
</div>
