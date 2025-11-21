import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { format, differenceInDays } from 'date-fns';
import ZUGFeRDGenerator from 'zugferd-generator';
import type { Settings } from '@prisma/client';

import { prisma } from '$lib/server/prisma';
import { getOrCreateSettings } from '$lib/server/settings';
import { renderInvoicePdf } from '$lib/server/pdf';
import {
	normalizeInvoice,
	type InvoiceWithRelations,
	type RenderInvoice
} from '$lib/server/invoice-format';
import { getInvoiceOutputDir, toStoredInvoicePath } from '$lib/server/invoice-storage';
import { createLogger } from '$lib/server/logger';

const OUTPUT_DIR = getInvoiceOutputDir();
const log = createLogger({ module: 'zugferd' });

type ZugferdInvoiceData = {
	id: string;
	issueDate: string;
	dueDate?: string;
	currency: string;
	totalAmount: number;
	supplier: {
		name: string;
		country: string;
		street?: string;
		postalCode?: string;
		city?: string;
		taxNumber?: string;
		legalEntityID?: string;
	};
	customer: {
		name: string;
		country: string;
		street?: string;
		postalCode?: string;
		city?: string;
		taxNumber?: string;
	};
	taxTotal: {
		taxAmount: number;
		taxPercentage: number;
	};
	paymentDetails?: {
		paymentMeansCode?: string;
		paymentID?: string;
		bankDetails?: {
			accountName?: string;
			iban?: string;
			bic?: string;
			bankName?: string;
		};
	};
	notes?: string[];
	lineItems: Array<{
		id: string;
		description: string;
		quantity: number;
		unitPrice: number;
		lineTotal: number;
	}>;
};

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
	const zugferd = new ZUGFeRDGenerator(invoiceData);
	const xmlBuffer = zugferd.toBuffer();
	const pdfBuffer = await renderInvoicePdf(normalizedInvoice, settings);
	const pdfWithEmbeddedXml = await zugferd.embedInPDF(pdfBuffer);

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

function buildInvoiceData(invoice: RenderInvoice, settings: Settings): ZugferdInvoiceData {
	const totalNet = invoice.totalNet || 0;
	const taxAmount = invoice.totalTax || 0;
	const taxPercentage =
		totalNet > 0 ? Math.round(((taxAmount / totalNet) * 100 + Number.EPSILON) * 100) / 100 : 0;

	const notes = invoice.notes
		?.split(/\r?\n/)
		.map(line => line.trim())
		.filter(line => line.length > 0);

	return {
		id: invoice.number,
		issueDate: format(invoice.issueDate, 'yyyy-MM-dd'),
		dueDate: invoice.dueDate ? format(invoice.dueDate, 'yyyy-MM-dd') : undefined,
		currency: invoice.currency ?? 'EUR',
		totalAmount: invoice.totalGross ?? 0,
		supplier: {
			name: settings.companyName ?? settings.personName ?? 'Unbekannt',
			country: settings.country ?? 'DE',
			street: settings.street ?? undefined,
			postalCode: settings.postalCode ?? undefined,
			city: settings.city ?? undefined,
			taxNumber: settings.taxNumber ?? undefined,
			legalEntityID: settings.vatId ?? undefined
		},
		customer: {
			name: invoice.recipient.name,
			country: invoice.recipient.country ?? 'DE',
			street: invoice.recipient.street ?? undefined,
			postalCode: invoice.recipient.postalCode ?? undefined,
			city: invoice.recipient.city ?? undefined,
			taxNumber: undefined
		},
		taxTotal: {
			taxAmount,
			taxPercentage
		},
		paymentDetails: buildPaymentDetails(settings, invoice),
		notes: notes && notes.length ? notes : undefined,
		lineItems: invoice.lineItems.map(item => ({
			id: `${item.id}`,
			description: item.description,
			quantity: item.quantity,
			unitPrice: item.unitPrice,
			lineTotal: item.lineTotal
		}))
	};
}

function buildPaymentDetails(settings: Settings, invoice: RenderInvoice) {
	if (!settings.iban && !settings.bic) {
		return undefined;
	}

	const daysUntilDue = differenceInDays(invoice.dueDate, invoice.issueDate);

	return {
		paymentMeansCode: '31',
		paymentID: `Zahlbar innerhalb von ${Math.max(daysUntilDue, 0)} Tagen`,
		bankDetails: {
			accountName: settings.companyName ?? settings.personName ?? undefined,
			iban: settings.iban ?? undefined,
			bic: settings.bic ?? undefined
		}
	};
}
