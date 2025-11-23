<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Impressum - Finanzcockpit</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6 px-4 py-8">
	<div>
		<h1 class="text-3xl font-semibold text-gray-900">Impressum</h1>
		<p class="mt-2 text-sm text-gray-500">
			Angaben gemäß § 5 TMG
		</p>
	</div>

	<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">Hinweis</h2>
			<p class="text-sm text-gray-600">
				Dies ist eine interne Anwendung zur Verwaltung von Rechnungen und Finanzdaten. 
				Die Registrierung ist deaktiviert. Diese Anwendung ist nicht für die öffentliche Nutzung bestimmt.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">Datenerhebung</h2>
			<p class="text-sm text-gray-600">
				Durch den bloßen Aufruf dieser Website werden keine personenbezogenen Daten erhoben oder gespeichert. 
				Es werden keine Cookies gesetzt, es sei denn, Sie melden sich an.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">Anmeldeversuche</h2>
			<p class="text-sm text-gray-600">
				Anmeldeversuche (sowohl erfolgreiche als auch fehlgeschlagene) werden protokolliert, 
				um die Sicherheit der Anwendung zu gewährleisten.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">Kontakt</h2>
			<p class="text-sm text-gray-600">
				Bei Fragen wenden Sie sich bitte an den Administrator dieser Anwendung.
			</p>
		</div>
	</div>

	<div class="pt-4">
		<a
			href={resolve('/login')}
			class="text-sm font-medium text-primary hover:text-primary-600"
			>← Zurück zur Anmeldung</a
		>
	</div>
</div>

