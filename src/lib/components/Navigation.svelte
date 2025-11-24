<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const { userEmail } = $props<{ userEmail: string }>();

const navigation = [
	{ href: '/', label: 'Übersicht' },
	{ href: '/invoices', label: 'Rechnungen' },
	{ href: '/planner', label: 'Planer' },
	{ href: '/recipients', label: 'Empfänger' },
	{ href: '/log', label: 'Log' },
	{ href: '/settings', label: 'Einstellungen' }
] as const;

	let mobileMenuOpen = $state(false);
</script>

<header class="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-50">
	<div class="mx-auto max-w-6xl px-4 py-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary font-semibold text-white"
				>
					F
				</div>
				<div class="hidden sm:block">
					<p class="text-base font-semibold text-gray-900">Finanzcockpit</p>
					<p class="text-xs text-gray-500">ZUGFeRD Rechnungen</p>
				</div>
			</div>
			<!-- Desktop Navigation -->
			<nav class="hidden lg:flex gap-6 text-sm font-medium text-gray-500">
				{#each navigation as item (item.href)}
					<a
						href={resolve(item.href)}
						class={`transition hover:text-gray-900 ${
							page.url.pathname === item.href ||
							(page.url.pathname.startsWith(item.href) && item.href !== '/')
								? 'text-gray-900'
								: ''
						}`}>{item.label}</a
					>
				{/each}
			</nav>
			<!-- Desktop User Menu -->
			<form method="POST" action="/logout" class="hidden lg:flex items-center gap-4">
				<span class="text-sm text-gray-600">{userEmail}</span>
				<button
					class="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
				>
					Abmelden
				</button>
			</form>
			<!-- Mobile Menu Button -->
			<button
				type="button"
				class="lg:hidden p-2 text-gray-600 hover:text-gray-900"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				aria-label="Menu"
			>
				{#if mobileMenuOpen}
					<!-- Close icon -->
					<svg
						class="h-6 w-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				{:else}
					<!-- Hamburger icon -->
					<svg
						class="h-6 w-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				{/if}
			</button>
		</div>
		<!-- Mobile Navigation -->
		{#if mobileMenuOpen}
			<div class="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
				<nav class="flex flex-col gap-4 text-sm font-medium text-gray-500">
					{#each navigation as item (item.href)}
						<a
							href={resolve(item.href)}
							onclick={() => (mobileMenuOpen = false)}
							class={`transition hover:text-gray-900 ${
								page.url.pathname === item.href ||
								(page.url.pathname.startsWith(item.href) && item.href !== '/')
									? 'text-gray-900'
									: ''
							}`}>{item.label}</a
						>
					{/each}
				</nav>
				<form method="POST" action="/logout" class="mt-4 pt-4 border-t border-gray-200">
					<div class="mb-3 text-sm text-gray-600 truncate">{userEmail}</div>
					<button
						type="submit"
						class="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
					>
						Abmelden
					</button>
				</form>
			</div>
		{/if}
	</div>
</header>

