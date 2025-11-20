<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	const { data, form } = $props<{
		data: { hasUser: boolean; oidcEnabled: boolean };
		form: unknown;
	}>();
	let activeTab = $state<'login' | 'register'>(data.hasUser ? 'login' : 'register');
</script>

<svelte:head>
	<title>Anmeldung - Finanzcockpit</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
	<div class="border-outline/40 w-full max-w-xl rounded-2xl border bg-white/90 p-8 shadow-xl">
		<h1 class="mb-2 text-center text-3xl font-semibold text-gray-900">Finanzcockpit</h1>
		<p class="mb-8 text-center text-sm text-gray-500">
			{#if data.hasUser}
				Melde dich an, um deine Rechnungen zu verwalten.
			{:else}
				Erstelle den ersten Nutzer, um loszulegen.
			{/if}
		</p>

		{#if !data.hasUser}
			<div class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
				<strong>Hinweis:</strong> Diese Instanz unterstützt nur einen Nutzer. Nach der ersten Registrierung
				ist kein weiterer Sign-up möglich.
			</div>
		{:else}
			<div class="mb-6 flex rounded-xl bg-gray-100 p-1">
				<button
					type="button"
					class={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
						activeTab === 'login'
							? 'bg-white text-gray-900 shadow'
							: 'text-gray-500 hover:text-gray-800'
					}`}
					onclick={() => (activeTab = 'login')}
				>
					Anmelden
				</button>
				<button
					type="button"
					class={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
						activeTab === 'register'
							? 'bg-white text-gray-900 shadow'
							: 'text-gray-500 hover:text-gray-800'
					}`}
					onclick={() => (activeTab = 'register')}
				>
					Registrieren
				</button>
			</div>
		{/if}

		<form
			method="POST"
			use:enhance
			action={data.hasUser && activeTab === 'login' ? '?/login' : '?/register'}
			class="space-y-5"
		>
			<div class="space-y-2">
				<label for="email" class="text-sm font-medium text-gray-700">E-Mail</label>
				<input
					id="email"
					name="email"
					type="email"
					class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/30"
					required
				/>
			</div>

			<div class="space-y-2">
				<label for="password" class="text-sm font-medium text-gray-700">Passwort</label>
				<input
					id="password"
					name="password"
					type="password"
					minlength="6"
					class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/30"
					required
				/>
			</div>

			{#if form?.message}
				<p class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					{form.message}
				</p>
			{/if}

			<button
				type="submit"
				class="w-full rounded-xl bg-primary px-4 py-3 text-base font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-600"
			>
				{data.hasUser && activeTab === 'login' ? 'Anmelden' : 'Registrieren'}
			</button>
		</form>

		{#if data.oidcEnabled}
			<div class="my-6 flex items-center gap-4">
				<div class="flex-1 border-t border-gray-200"></div>
				<span class="text-sm text-gray-500">oder</span>
				<div class="flex-1 border-t border-gray-200"></div>
			</div>

			{@const nextUrl = $page.url.searchParams.get('next') || '/'}
			<a
				href="/auth/oidc?next={encodeURIComponent(nextUrl)}"
				class="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
						fill="currentColor"
					/>
				</svg>
				Mit OIDC anmelden
			</a>
		{/if}
	</div>
</main>
