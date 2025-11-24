<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<footer class="mt-auto border-t border-gray-200 bg-white/90 backdrop-blur">
	<div class="mx-auto max-w-6xl px-4 py-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="text-sm text-gray-600">
				<p class="font-semibold text-gray-900">Finanzcockpit</p>
				<p class="mt-1 text-xs text-gray-500">
					© {new Date().getFullYear()} Alle Rechte vorbehalten
				</p>
			</div>
			<nav class="flex flex-wrap gap-4 text-sm text-gray-600">
				<a href={resolve('/impressum')} class="transition hover:text-gray-900">Impressum</a>
				<a href={resolve('/datenschutz')} class="transition hover:text-gray-900"
					>Datenschutzerklärung</a
				>
			</nav>
		</div>
	</div>
</footer>
