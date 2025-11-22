<script lang="ts">
	import type { Settings } from '$lib/server/prisma/client';
	import type { RenderInvoice } from '$lib/server/invoice-format';
	import { format } from 'date-fns';

	let { invoice, settings }: { invoice: RenderInvoice; settings: Settings } = $props();

	const currency = invoice.currency ?? 'EUR';

	const formatCurrency = (value: number) =>
		new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(value);

	const formatDate = (value: Date) => format(value, 'dd.MM.yyyy');

	const sellerLines = [
		settings.companyName ?? settings.personName ?? '',
		settings.street,
		[settings.postalCode, settings.city].filter(Boolean).join(' '),
		settings.country
	].filter(line => (line ?? '').toString().trim().length > 0);

	const recipientLines = [
		invoice.recipient.company,
		invoice.recipient.street,
		[invoice.recipient.postalCode, invoice.recipient.city].filter(Boolean).join(' '),
		invoice.recipient.country
	].filter(line => (line ?? '').toString().trim().length > 0);

	const paymentLines = [
		settings.iban ? `IBAN: ${settings.iban}` : undefined,
		settings.bic ? `BIC: ${settings.bic}` : undefined,
		settings.companyName || settings.personName
			? `Kontoinhaber: ${settings.companyName ?? settings.personName}`
			: undefined
	].filter(Boolean) as string[];

	const legalNote =
		(invoice.notes ?? '').trim() || (settings.legalStatus ?? '').trim() || undefined;
</script>

<div
	class="flex min-h-screen flex-col bg-surface p-[20px_24px] font-sans text-[13px] leading-[1.45] text-[#1f2a44]"
	data-section="invoice"
>
	<header class="flex items-start justify-between border-b-2 border-[#c8d6f1] pb-3">
		<div>
			<p class="m-0 text-[26px] font-medium tracking-[0.2em] text-[#4c5a88]">RECHNUNG</p>
			<p class="mt-1 text-xs tracking-widest text-[#6b7a99] uppercase" data-field="seller-name">
				{settings.legalStatus ?? ''}: {settings.companyName ?? settings.personName ?? ''}
			</p>
		</div>
		<div class="flex items-start gap-5">
			<div class="flex flex-col items-end text-xs text-[#6b7a99]">
				<span class="mb-1.5 text-[11px] tracking-[0.08em] text-[#94a3b8] uppercase">Datum</span>
				<span class="text-sm font-semibold text-[#1f2a44]" data-meta="issue-date"
					>{formatDate(invoice.issueDate)}</span
				>
			</div>
			<div class="flex flex-col items-end text-xs text-[#6b7a99]">
				<span class="mb-1.5 text-[11px] tracking-[0.08em] text-[#94a3b8] uppercase"
					>Rechnungsnr.</span
				>
				<span class="text-sm font-semibold text-[#1f2a44]" data-meta="number">{invoice.number}</span
				>
			</div>
		</div>
	</header>

	<section class="my-3 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
		<div class="rounded-lg border border-[#e2e8f0] bg-white p-3">
			<p class="mb-1.5 text-[11px] tracking-[0.08em] text-[#94a3b8] uppercase">Ausgestellt von</p>
			<p class="mb-1 text-[15px] font-semibold text-[#1f2a44]">
				{settings.personName ?? settings.companyName ?? ''}
			</p>
			<p class="text-xs whitespace-pre-line text-[#4c5a88]" data-field="seller-address">
				{#each sellerLines as line, index (index)}
					<span>{line}</span>{#if index < sellerLines.length - 1}<br />{/if}
				{/each}
			</p>
			{#if settings.emailFrom}
				<p class="text-xs text-[#4c5a88]" data-field="seller-email">
					<a href={`mailto:${settings.emailFrom}`}>{settings.emailFrom}</a>
				</p>
			{/if}
		</div>
		<div class="rounded-lg border border-[#e2e8f0] bg-white p-3" data-section="meta">
			<p class="mb-1.5 text-[11px] tracking-[0.08em] text-[#94a3b8] uppercase">An</p>
			<p class="mb-1 text-[15px] font-semibold text-[#1f2a44]" data-field="recipient-name">
				{invoice.recipient.name ?? invoice.recipient.company ?? ''}
			</p>
			<p class="text-xs whitespace-pre-line text-[#4c5a88]" data-field="recipient-address">
				{#each recipientLines as line, index (index)}
					<span>{line}</span>{#if index < recipientLines.length - 1}<br />{/if}
				{/each}
			</p>
			{#if invoice.recipient.email}
				<p class="text-xs text-[#4c5a88]" data-field="recipient-email">
					<a href={`mailto:${invoice.recipient.email}`}>{invoice.recipient.email}</a>
				</p>
			{/if}
			<div class="mt-2.5 flex justify-between text-xs text-[#4c5a88]">
				<span>Fällig am</span>
				<span class="text-sm font-semibold text-[#1f2a44]" data-meta="due-date"
					>{formatDate(invoice.dueDate)}</span
				>
			</div>
		</div>
	</section>

	<section class="mb-4 border-l-4 border-[#94b5ff] bg-white p-2">
		<p class="mb-1 text-[11px] text-[#6b7a99] uppercase">Rechnung über Tätigkeit</p>
		<p class="m-0 text-[#1f2a44]">
			Sehr geehrte Damen und Herren,<br />
			ich bedanke mich für die erfolgreiche Zusammenarbeit und stelle Ihnen gemäß Vereinbarung folgende
			Leistung in Rechnung:
		</p>
	</section>

	<section class="items">
		<table class="w-full border-collapse overflow-hidden rounded-lg bg-white" data-section="items">
			<thead>
				<tr>
					<th
						class="bg-[#e9effb] px-2 py-2 text-left text-[11px] font-semibold tracking-[0.08em] text-[#4c5a88] uppercase"
					>
						Menge
					</th>
					<th
						class="bg-[#e9effb] px-2 py-2 text-left text-[11px] font-semibold tracking-[0.08em] text-[#4c5a88] uppercase"
					>
						Kostenpunkt
					</th>
					<th
						class="bg-[#e9effb] px-2 py-2 text-right text-[11px] font-semibold tracking-[0.08em] text-[#4c5a88] uppercase"
					>
						Einzelpreis
					</th>
					<th
						class="bg-[#e9effb] px-2 py-2 text-right text-[11px] font-semibold tracking-[0.08em] text-[#4c5a88] uppercase"
					>
						Gesamt
					</th>
				</tr>
			</thead>
			<tbody>
				{#each invoice.lineItems as item, index (item.id ?? index)}
					<tr data-row="item">
						<td
							class="px-2 py-2 {index < invoice.lineItems.length - 1
								? 'border-b border-[#edf2ff]'
								: ''} align-top text-[13px] text-[#1f2a44]"
						>
							{item.quantity}
						</td>
						<td
							class="px-2 py-2 {index < invoice.lineItems.length - 1
								? 'border-b border-[#edf2ff]'
								: ''} align-top text-[13px] text-[#1f2a44]"
						>
							<p class="m-0 font-semibold">{item.description}</p>
						</td>
						<td
							class="px-2 py-2 {index < invoice.lineItems.length - 1
								? 'border-b border-[#edf2ff]'
								: ''} text-right align-top text-[13px] text-[#1f2a44]"
						>
							{formatCurrency(item.unitPrice)}
						</td>
						<td
							class="px-2 py-2 {index < invoice.lineItems.length - 1
								? 'border-b border-[#edf2ff]'
								: ''} text-right align-top text-[13px] text-[#1f2a44]"
						>
							{formatCurrency(item.lineTotal)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section
		class="mt-4 ml-auto w-[300px] overflow-hidden rounded-lg border border-[#cfd8f3] bg-white"
		data-section="totals"
	>
		<div
			class="flex justify-between border-b border-[#e6ecff] px-3 py-2 text-[13px] text-[#4c5a88]"
		>
			<span>Zwischensumme</span>
			<span data-total="net">{formatCurrency(invoice.totalNet)}</span>
		</div>
		<div
			class="flex justify-between border-b border-[#e6ecff] px-3 py-2 text-[13px] text-[#4c5a88]"
		>
			<span>Steuer</span>
			<span data-total="tax">{formatCurrency(invoice.totalTax)}</span>
		</div>
		<div class="flex justify-between bg-[#e2f1ff] px-3 py-2 text-sm font-bold text-[#1f2a44]">
			<span>Gesamtsumme</span>
			<span data-total="gross">{formatCurrency(invoice.totalGross)}</span>
		</div>
	</section>

	{#if legalNote}
		<section class="mt-4 rounded-lg border border-[#e2e8f0] bg-white p-3" data-section="notes">
			<p class="mb-1.5 text-[11px] text-[#6b7a99] uppercase">Hinweise / Rechtliches</p>
			<p>{legalNote}</p>
		</section>
	{/if}

	<div class="mt-auto">
		{#if paymentLines.length}
			<section class="mt-4 rounded-lg border border-[#e2e8f0] bg-white p-2" data-section="payment">
				<p class="mb-1.5 text-[11px] text-[#6b7a99] uppercase">
					Bitte überweisen Sie auf folgendes Konto
				</p>
				<ul class="m-0 list-none p-0 text-[13px] text-[#1f2a44]">
					{#each paymentLines as line, index (index)}
						<li class={index > 0 ? 'mt-1' : ''} data-payment={`payment-${index}`}>{line}</li>
					{/each}
				</ul>
			</section>
		{/if}

		<footer
			class="mt-4 border-t border-[#e2e8f0] pt-3 text-[11px] text-[#6b7a99]"
			data-section="footer"
		>
			<div class="flex flex-wrap justify-between gap-x-4 gap-y-1">
				{#if settings.companyName || settings.personName}
					<span data-footer="company-name">
						{settings.companyName ?? settings.personName}
						{#if settings.legalStatus}
							<span class="text-[#94a3b8]"> • {settings.legalStatus}</span>
						{/if}
					</span>
				{/if}
				{#if settings.taxNumber}
					<span data-footer="tax-number">Steuernummer: {settings.taxNumber}</span>
				{/if}
				{#if settings.wirtschaftsIdentNr}
					<span data-footer="wirtschafts-id">Wirtschafts-ID: {settings.wirtschaftsIdentNr}</span>
				{/if}
				{#if settings.vatId}
					<span data-footer="vat-id">Umsatzsteuer-ID: {settings.vatId}</span>
				{/if}
			</div>
		</footer>
	</div>
</div>
