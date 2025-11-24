<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';

	const { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Log - Finanzcockpit</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-semibold text-gray-900">Login-Protokoll</h1>
		<p class="text-sm text-gray-500">Erfasste An- und Abmeldeversuche</p>
	</div>

	<section class="rounded-2xl border border-gray-200 bg-white shadow-sm">
		<div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
			<div>
				<h2 class="text-lg font-semibold text-gray-900">Letzte Versuche</h2>
				<p class="text-xs text-gray-500">Neueste 200 Einträge</p>
			</div>
		</div>

		{#if data.attempts.length === 0}
			<p class="px-6 py-10 text-sm text-gray-500">Keine Login-Versuche protokolliert.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-100 text-sm">
					<thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
						<tr>
							<th class="px-6 py-3">Zeitpunkt</th>
							<th class="px-6 py-3">E-Mail</th>
							<th class="px-6 py-3">Status</th>
							<th class="px-6 py-3">IP-Adresse</th>
							<th class="px-6 py-3">User Agent</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-50 bg-white">
						{#each data.attempts as attempt}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-6 py-3 text-gray-900">
									{format(new Date(attempt.createdAt), "dd.MM.yyyy '·' HH:mm:ss")}
								</td>
								<td class="px-6 py-3">
									<div class="flex flex-col">
										<span class="font-medium text-gray-900">{attempt.email}</span>
										{#if attempt.user?.email && attempt.user.email !== attempt.email}
											<span class="text-xs text-gray-500">
												Zugewiesen: {attempt.user.email}
											</span>
										{/if}
									</div>
								</td>
								<td class="px-6 py-3">
									<span
										class={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
											attempt.success
												? 'bg-green-100 text-green-800'
												: 'bg-red-100 text-red-800'
										}`}
									>
										{attempt.success ? 'Erfolgreich' : 'Fehlgeschlagen'}
									</span>
								</td>
								<td class="whitespace-nowrap px-6 py-3 text-gray-600">
									{attempt.ipAddress ?? '—'}
								</td>
								<td class="px-6 py-3 text-gray-600">
									<div class="max-w-xs truncate" title={attempt.userAgent ?? undefined}>
										{attempt.userAgent ?? '—'}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

