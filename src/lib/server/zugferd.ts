import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { format, differenceInDays } from 'date-fns';
import { InvoiceService, type Invoice, type FileInfo } from '@e-invoice-eu/core';
import type { Settings } from '$lib/server/prisma/client';

import { prisma } from '$lib/server/prisma';
import { getOrCreateSettings } from '$lib/server/settings';
import { renderInvoicePdf } from '$lib/server/pdf';
import {
	normalizeInvoice,
	type InvoiceWithRelations,
	type RenderInvoice,
	type RenderInvoiceLineItem
} from '$lib/server/invoice-format';
import { getInvoiceOutputDir, toStoredInvoicePath } from '$lib/server/invoice-storage';
import { createLogger } from '$lib/server/logger';

const FACTURX_CUSTOMIZATION_ID = 'urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended';
const FACTURX_PROFILE_ID = 'urn:factur-x.eu:1p0:extended';
const DEFAULT_COUNTRY_CODE = 'DE';
const DEFAULT_UNIT_CODE = 'C62';
const TAX_SCHEME_ID = 'VAT';
const EMAIL_SCHEME_ID = 'EM';
const PAYMENT_MEANS_CODE = '31';
const PAYMENT_MEANS_NAME = 'Überweisung';
const FALLBACK_EMAIL = 'info@example.com';

const invoiceService = new InvoiceService(console);

type CurrencyCode = Invoice['ubl:Invoice']['cbc:DocumentCurrencyCode'];
type InvoiceLinePayload = Invoice['ubl:Invoice']['cac:InvoiceLine'][number];
type InvoiceTaxTotal = Invoice['ubl:Invoice']['cac:TaxTotal'][number];
type InvoiceTaxSubtotal = NonNullable<InvoiceTaxTotal['cac:TaxSubtotal']>[number];
type PaymentInstruction = NonNullable<Invoice['ubl:Invoice']['cac:PaymentMeans']>[number];
type PaymentTermsPayload = Invoice['ubl:Invoice']['cac:PaymentTerms'];
type Endpoint = { id: string; scheme?: typeof EMAIL_SCHEME_ID };

const OUTPUT_DIR = getInvoiceOutputDir();
const log = createLogger({ module: 'zugferd' });

export async function generateZugferdArtifacts(invoiceId: number) {
	const invoice = (await prisma.invoice.findUnique({
		where: { id: invoiceId },
		include: { recipient: true, lineItems: true }
	})) as InvoiceWithRelations | null;

	if (!invoice) {
		throw new Error('Rechnung nicht gefunden');
	}

	const settings = await getOrCreateSettings();
	const normalizedInvoice = normalizeInvoice(invoice);

	const folder = path.join(OUTPUT_DIR, invoice.number);
	await mkdir(folder, { recursive: true });

	const invoiceData = buildInvoiceData(normalizedInvoice, settings);
	const pdfBuffer = await renderInvoicePdf(normalizedInvoice, settings);
	const pdfFileInfo: FileInfo = {
		buffer: new Uint8Array(pdfBuffer),
		filename: `${invoice.number}.pdf`,
		mimetype: 'application/pdf'
	};

	const facturxPdfPayload = await invoiceService.generate(invoiceData, {
		format: 'Factur-X-Extended',
		lang: 'de-de',
		pdf: pdfFileInfo
	});

	const xmlPayload = await invoiceService.generate(invoiceData, {
		format: 'CII',
		lang: 'de-de'
	});

	const pdfWithEmbeddedXml = toBuffer(facturxPdfPayload);
	const xmlBuffer = toBuffer(xmlPayload);

	const pdfFilePath = path.join(folder, 'rechnung.pdf');
	const xmlFilePath = path.join(folder, 'rechnung.zugferd.xml');

	await writeFile(pdfFilePath, pdfWithEmbeddedXml);
	await writeFile(xmlFilePath, xmlBuffer);

	log.info(
		{ invoiceNumber: invoice.number, folder, pdf: pdfFilePath, xml: xmlFilePath },
		'Generated ZUGFeRD artifacts'
	);

	return {
		pdfPath: toStoredInvoicePath(pdfFilePath),
		xmlPath: toStoredInvoicePath(xmlFilePath),
		texPath: null
	};
}

function buildInvoiceData(invoice: RenderInvoice, settings: Settings): Invoice {
	if (!invoice.lineItems.length) {
		throw new Error('Rechnung enthält keine Positionen');
	}

	const currency = (invoice.currency ?? 'EUR').toUpperCase() as CurrencyCode;
	const sellerName = settings.companyName ?? settings.personName ?? 'Unbekannt';
	const buyerName = invoice.recipient.company ?? invoice.recipient.name ?? 'Empfänger';

	const supplierCountry = normalizeCountryCode(settings.country);
	const customerCountry = normalizeCountryCode(invoice.recipient.country);

	const sellerEndpoint = deriveEndpoint(settings.emailFrom, 'seller');
	const buyerEndpoint = deriveEndpoint(
		invoice.recipient.email,
		`recipient-${invoice.recipient.id}`
	);

	const supplierAddress = buildPostalAddress(
		settings.street,
		settings.postalCode,
		settings.city,
		supplierCountry
	) as Invoice['ubl:Invoice']['cac:AccountingSupplierParty']['cac:Party']['cac:PostalAddress'];

	const customerAddress = buildPostalAddress(
		invoice.recipient.street,
		invoice.recipient.postalCode,
		invoice.recipient.city,
		customerCountry
	) as Invoice['ubl:Invoice']['cac:AccountingCustomerParty']['cac:Party']['cac:PostalAddress'];

	const invoiceLines = buildInvoiceLines(invoice.lineItems, currency);
	const invoiceLineTuple = toNonEmptyTuple(
		invoiceLines,
		'Rechnung enthält keine Positionen für ZUGFeRD'
	);

	const taxSummary = buildTaxSummary(invoice.lineItems, invoice.totalTax ?? 0, currency);
	const taxTotalCurrency = castCurrency<InvoiceTaxTotal['cbc:TaxAmount@currencyID']>(currency);
	const taxTotals: [InvoiceTaxTotal] = [
		{
			'cbc:TaxAmount': formatAmount(taxSummary.totalTax),
			'cbc:TaxAmount@currencyID': taxTotalCurrency,
			'cac:TaxSubtotal': taxSummary.breakdown
		}
	];

	const paymentInstructions = buildPaymentInstructions(settings, sellerName, invoice);
	const paymentTerms = buildPaymentTerms(invoice);
	const notes = extractNotes(invoice.notes);

	const ublInvoice = {
		'cbc:CustomizationID': FACTURX_CUSTOMIZATION_ID,
		'cbc:ProfileID': FACTURX_PROFILE_ID,
		'cbc:ID': invoice.number,
		'cbc:IssueDate': format(invoice.issueDate, 'yyyy-MM-dd'),
		'cbc:DueDate': format(invoice.dueDate, 'yyyy-MM-dd'),
		'cbc:InvoiceTypeCode': '380',
		'cbc:DocumentCurrencyCode': currency,
		...(notes.length ? { 'cbc:Note': notes } : {}),
		'cac:AccountingSupplierParty': {
			'cac:Party': {
				'cbc:EndpointID': sellerEndpoint.id,
				...(sellerEndpoint.scheme ? { 'cbc:EndpointID@schemeID': sellerEndpoint.scheme } : {}),
				'cac:PartyName': {
					'cbc:Name': sellerName
				},
				'cac:PostalAddress': supplierAddress,
				'cac:PartyLegalEntity': {
					'cbc:RegistrationName': sellerName,
					...(settings.vatId ? { 'cbc:CompanyID': settings.vatId } : {}),
					...(settings.legalStatus ? { 'cbc:CompanyLegalForm': settings.legalStatus } : {})
				}
			}
		},
		'cac:AccountingCustomerParty': {
			'cac:Party': {
				'cbc:EndpointID': buyerEndpoint.id,
				...(buyerEndpoint.scheme ? { 'cbc:EndpointID@schemeID': buyerEndpoint.scheme } : {}),
				'cac:PartyName': {
					'cbc:Name': buyerName
				},
				'cac:PostalAddress': customerAddress,
				'cac:PartyLegalEntity': {
					'cbc:RegistrationName': buyerName
				}
			}
		},
		...(paymentInstructions ? { 'cac:PaymentMeans': [paymentInstructions] } : {}),
		...(paymentTerms ? { 'cac:PaymentTerms': paymentTerms } : {}),
		'cac:TaxTotal': taxTotals,
		'cac:LegalMonetaryTotal': {
			'cbc:LineExtensionAmount': formatAmount(invoice.totalNet),
			'cbc:LineExtensionAmount@currencyID':
				castCurrency<
					Invoice['ubl:Invoice']['cac:LegalMonetaryTotal']['cbc:LineExtensionAmount@currencyID']
				>(currency),
			'cbc:TaxExclusiveAmount': formatAmount(invoice.totalNet),
			'cbc:TaxExclusiveAmount@currencyID':
				castCurrency<
					Invoice['ubl:Invoice']['cac:LegalMonetaryTotal']['cbc:TaxExclusiveAmount@currencyID']
				>(currency),
			'cbc:TaxInclusiveAmount': formatAmount(invoice.totalGross),
			'cbc:TaxInclusiveAmount@currencyID':
				castCurrency<
					Invoice['ubl:Invoice']['cac:LegalMonetaryTotal']['cbc:TaxInclusiveAmount@currencyID']
				>(currency),
			'cbc:PayableAmount': formatAmount(invoice.totalGross),
			'cbc:PayableAmount@currencyID':
				castCurrency<
					Invoice['ubl:Invoice']['cac:LegalMonetaryTotal']['cbc:PayableAmount@currencyID']
				>(currency)
		},
		'cac:InvoiceLine': invoiceLineTuple
	} satisfies Invoice['ubl:Invoice'];

	return { 'ubl:Invoice': ublInvoice };
}

function buildInvoiceLines(
	items: RenderInvoiceLineItem[],
	currency: CurrencyCode
): InvoiceLinePayload[] {
	const lineCurrency =
		castCurrency<InvoiceLinePayload['cbc:LineExtensionAmount@currencyID']>(currency);
	const priceCurrency =
		castCurrency<InvoiceLinePayload['cac:Price']['cbc:PriceAmount@currencyID']>(currency);

	return items.map((item, index) => {
		const description = item.description || `Position ${index + 1}`;
		const rate = Number.isFinite(item.taxRate) ? item.taxRate : 0;

		return {
			'cbc:ID': `${index + 1}`,
			'cbc:InvoicedQuantity': formatQuantity(item.quantity),
			'cbc:InvoicedQuantity@unitCode': DEFAULT_UNIT_CODE,
			'cbc:LineExtensionAmount': formatAmount(roundToTwo(item.lineTotal)),
			'cbc:LineExtensionAmount@currencyID': lineCurrency,
			'cac:Item': {
				'cbc:Description': description,
				'cbc:Name': description,
				'cac:ClassifiedTaxCategory': {
					'cbc:ID': rate > 0 ? 'S' : 'Z',
					'cbc:Percent': formatPercentage(rate),
					'cac:TaxScheme': {
						'cbc:ID': TAX_SCHEME_ID
					}
				}
			},
			'cac:Price': {
				'cbc:PriceAmount': formatAmount(roundToTwo(item.unitPrice)),
				'cbc:PriceAmount@currencyID': priceCurrency,
				'cbc:BaseQuantity': '1',
				'cbc:BaseQuantity@unitCode': DEFAULT_UNIT_CODE
			}
		};
	});
}

function buildTaxSummary(
	items: RenderInvoiceLineItem[],
	totalTax: number,
	currency: CurrencyCode
): { breakdown: InvoiceTaxSubtotal[]; totalTax: number } {
	const buckets = new Map<number, number>();

	for (const item of items) {
		const rate = Number.isFinite(item.taxRate) ? item.taxRate : 0;
		const current = buckets.get(rate) ?? 0;
		buckets.set(rate, roundToTwo(current + item.lineTotal));
	}

	if (!buckets.size) {
		buckets.set(0, 0);
	}

	const breakdownEntries = Array.from(buckets.entries()).map(([rate, taxable]) => {
		const taxAmount = roundToTwo((taxable * rate) / 100);
		return { rate, taxable: roundToTwo(taxable), taxAmount };
	});

	const computedTotal = roundToTwo(
		breakdownEntries.reduce((sum, entry) => sum + entry.taxAmount, 0)
	);
	const targetTotal = roundToTwo(totalTax ?? computedTotal);
	const diff = roundToTwo(targetTotal - computedTotal);

	if (breakdownEntries.length > 0 && Math.abs(diff) >= 0.01) {
		const last = breakdownEntries[breakdownEntries.length - 1];
		last.taxAmount = roundToTwo(last.taxAmount + diff);
	}

	const taxableCurrency =
		castCurrency<InvoiceTaxSubtotal['cbc:TaxableAmount@currencyID']>(currency);
	const taxCurrency = castCurrency<InvoiceTaxSubtotal['cbc:TaxAmount@currencyID']>(currency);

	const breakdown: InvoiceTaxSubtotal[] = breakdownEntries.map(entry => ({
		'cbc:TaxableAmount': formatAmount(entry.taxable),
		'cbc:TaxableAmount@currencyID': taxableCurrency,
		'cbc:TaxAmount': formatAmount(entry.taxAmount),
		'cbc:TaxAmount@currencyID': taxCurrency,
		'cac:TaxCategory': {
			'cbc:ID': entry.rate > 0 ? 'S' : 'Z',
			'cbc:Percent': formatPercentage(entry.rate),
			'cac:TaxScheme': {
				'cbc:ID': TAX_SCHEME_ID
			}
		}
	}));

	return { breakdown, totalTax: targetTotal };
}

function extractNotes(notes?: string | null): string[] {
	return (
		notes
			?.split(/\r?\n/)
			.map(line => line.trim())
			.filter(line => line.length > 0) ?? []
	);
}

function buildPaymentInstructions(
	settings: Settings,
	accountName: string,
	invoice: RenderInvoice
): PaymentInstruction | undefined {
	const sanitizedIban = sanitizeIban(settings.iban);
	if (!sanitizedIban) {
		return undefined;
	}

	const account: NonNullable<PaymentInstruction['cac:PayeeFinancialAccount']> = {
		'cbc:ID': sanitizedIban
	};

	if (accountName) {
		account['cbc:Name'] = accountName;
	}

	if (settings.bic) {
		account['cac:FinancialInstitutionBranch'] = {
			'cbc:ID': settings.bic
		};
	}

	return {
		'cbc:PaymentMeansCode': PAYMENT_MEANS_CODE,
		'cbc:PaymentMeansCode@name': PAYMENT_MEANS_NAME,
		'cbc:PaymentID': invoice.number,
		'cac:PayeeFinancialAccount': account
	};
}

function buildPaymentTerms(invoice: RenderInvoice): PaymentTermsPayload | undefined {
	if (!invoice.dueDate || !invoice.issueDate) {
		return undefined;
	}

	const daysUntilDue = Math.max(differenceInDays(invoice.dueDate, invoice.issueDate), 0);
	const dueDateText = format(invoice.dueDate, 'yyyy-MM-dd');
	const note =
		daysUntilDue > 0
			? `Zahlbar innerhalb von ${daysUntilDue} Tagen (bis ${dueDateText})`
			: `Fällig am ${dueDateText}`;

	return {
		'cbc:Note': note
	};
}

function deriveEndpoint(preferred?: string | null, fallback?: string): Endpoint {
	const trimmedPreferred = preferred?.trim();
	if (trimmedPreferred) {
		return { id: trimmedPreferred, scheme: EMAIL_SCHEME_ID };
	}

	const trimmedFallback = fallback?.trim();
	if (trimmedFallback) {
		return { id: trimmedFallback };
	}

	return { id: FALLBACK_EMAIL, scheme: EMAIL_SCHEME_ID };
}

function buildPostalAddress(
	street: string | null | undefined,
	postalCode: string | null | undefined,
	city: string | null | undefined,
	countryCode: string
) {
	return {
		...(street ? { 'cbc:StreetName': street } : {}),
		...(city ? { 'cbc:CityName': city } : {}),
		...(postalCode ? { 'cbc:PostalZone': postalCode } : {}),
		'cac:Country': {
			'cbc:IdentificationCode': countryCode
		}
	};
}

function normalizeCountryCode(value?: string | null): string {
	const candidate = value?.trim().toUpperCase();
	if (candidate && /^[A-Z]{2}$/.test(candidate)) {
		return candidate;
	}

	return DEFAULT_COUNTRY_CODE;
}

function formatAmount(value: number): string {
	return roundToTwo(value).toFixed(2);
}

function roundToTwo(value: number): number {
	const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function formatQuantity(value: number): string {
	if (Number.isInteger(value)) {
		return value.toString();
	}

	return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function formatPercentage(value: number): string {
	return roundToTwo(value).toString();
}

function sanitizeIban(iban?: string | null): string | undefined {
	if (!iban) {
		return undefined;
	}

	const normalized = iban.replace(/\s+/g, '').toUpperCase();
	return normalized || undefined;
}

function toNonEmptyTuple<T>(items: T[], errorMessage: string): [T, ...T[]] {
	if (items.length === 0) {
		throw new Error(errorMessage);
	}

	return [items[0], ...items.slice(1)];
}

function castCurrency<T extends string | undefined>(currency: CurrencyCode): NonNullable<T> {
	return currency as NonNullable<T>;
}

function toBuffer(payload: string | Uint8Array): Buffer {
	return typeof payload === 'string' ? Buffer.from(payload, 'utf-8') : Buffer.from(payload);
}
