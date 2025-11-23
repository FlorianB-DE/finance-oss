<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Datenschutzerklärung - Finanzcockpit</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6 px-4 py-8">
	<div>
		<h1 class="text-3xl font-semibold text-gray-900">Datenschutzerklärung</h1>
		<p class="mt-2 text-sm text-gray-500">
			Informationen gemäß Art. 13 DSGVO
		</p>
	</div>

	<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">1. Allgemeine Informationen</h2>
			<p class="text-sm text-gray-600">
				Diese Anwendung ist eine interne Anwendung zur Verwaltung von Rechnungen und Finanzdaten. 
				Die Registrierung ist deaktiviert. Diese Anwendung ist nicht für die öffentliche Nutzung bestimmt.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">2. Datenerhebung beim Besuch der Website</h2>
			<p class="text-sm text-gray-600">
				Beim bloßen Aufruf dieser Website werden <strong>keine personenbezogenen Daten</strong> erhoben oder gespeichert. 
				Es werden keine Cookies gesetzt, es sei denn, Sie melden sich an. 
				Es findet keine Analyse oder Tracking statt.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">3. Protokollierung von Anmeldeversuchen</h2>
			<p class="text-sm text-gray-600">
				Anmeldeversuche (sowohl erfolgreiche als auch fehlgeschlagene) werden protokolliert, 
				um die Sicherheit der Anwendung zu gewährleisten. Dabei werden folgende Informationen erfasst:
			</p>
			<ul class="mt-2 ml-4 list-disc text-sm text-gray-600 space-y-1">
				<li>Zeitpunkt des Anmeldeversuchs</li>
				<li>Verwendete E-Mail-Adresse</li>
				<li>Erfolg oder Fehlschlag des Versuchs</li>
			</ul>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">4. Datenerhebung nach der Anmeldung</h2>
			<p class="text-sm text-gray-600">
				Nach erfolgreicher Anmeldung werden folgende Daten verarbeitet:
			</p>
			<ul class="mt-2 ml-4 list-disc text-sm text-gray-600 space-y-1">
				<li>E-Mail-Adresse (für die Anmeldung)</li>
				<li>Rechnungsdaten (Empfänger, Beträge, Daten)</li>
				<li>Einstellungen und Konfiguration</li>
				<li>Session-Daten (für die Authentifizierung)</li>
			</ul>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">5. Zweck der Datenverarbeitung</h2>
			<p class="text-sm text-gray-600">
				Die Daten werden ausschließlich für den Betrieb der Anwendung verwendet:
			</p>
			<ul class="mt-2 ml-4 list-disc text-sm text-gray-600 space-y-1">
				<li>Authentifizierung und Zugriffskontrolle</li>
				<li>Verwaltung von Rechnungen und Finanzdaten</li>
				<li>Erstellung von PDF-Rechnungen</li>
				<li>Sicherheitsprotokollierung</li>
			</ul>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">6. Datenübertragung</h2>
			<p class="text-sm text-gray-600">
				Die Daten werden nicht an Dritte weitergegeben. Alle Daten verbleiben auf dem Server, 
				auf dem die Anwendung installiert ist.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">7. Cookies und Session-Daten</h2>
			<p class="text-sm text-gray-600">
				Die Anwendung verwendet Session-Cookies zur Authentifizierung. 
				Diese werden beim Schließen des Browsers gelöscht. Ohne Anmeldung werden keine Cookies gesetzt.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">8. Ihre Rechte</h2>
			<p class="text-sm text-gray-600">
				Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, 
				Widerspruch gegen die Verarbeitung sowie auf Datenübertragbarkeit. 
				Bitte kontaktieren Sie den Administrator der Anwendung.
			</p>
		</div>

		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-2">9. Sicherheit</h2>
			<p class="text-sm text-gray-600">
				Die Daten werden lokal gespeichert und sind nur für autorisierte Benutzer zugänglich. 
				Es liegt in der Verantwortung des Administrators, angemessene Sicherheitsmaßnahmen zu treffen.
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

