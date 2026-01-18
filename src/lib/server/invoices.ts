import { prisma } from '$lib/server/prisma';
import type { Invoice } from '$lib/server/prisma/client';
import { getNextInvoiceNumber } from '$lib/server/settings';
import { addDays } from 'date-fns';
import { generateZugferdArtifacts } from '$lib/server/zugferd';
import { isWebDAVConfigured, uploadInvoiceToWebDAV } from '$lib/server/webdav';
import { createLogger } from '$lib/server/logger';

const log = createLogger({ module: 'invoices' });

type CreateInvoiceInput = {
	recipientId: number;
	items: Array<{
		description: string;
		quantity: number;
		unitPrice: number;
		taxRate: number;
	}>;
	issueDate?: string;
	dueDate?: string;
	notes?: string;
};

export async function createInvoice(data: CreateInvoiceInput) {
	if (!data.items.length) {
		throw new Error('Mindestens eine Position ist erforderlich');
	}

	const number = await getNextInvoiceNumber();

	const issueDate = data.issueDate && data.issueDate !== '' ? new Date(data.issueDate) : new Date();
	const dueDate =
		data.dueDate && data.dueDate !== '' ? new Date(data.dueDate) : addDays(issueDate, 14);

	const totals = calculateTotals(data.items);

	const invoice = await prisma.invoice.create({
		data: {
			number,
			issueDate,
			dueDate,
			recipientId: data.recipientId,
			notes: data.notes,
			totalNet: totals.net,
			totalTax: totals.tax,
			totalGross: totals.gross,
			lineItems: {
				create: data.items.map((item, index) => ({
					description: item.description,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
					taxRate: item.taxRate,
					position: index + 1
				}))
			}
		},
		include: {
			recipient: true,
			lineItems: true
		}
	});

	const artifacts = await generateZugferdArtifacts(invoice.id);

	return prisma.invoice.update({
		where: { id: invoice.id },
		data: artifacts,
		include: {
			recipient: true,
			lineItems: true
		}
	});
}

export function calculateTotals(items: CreateInvoiceInput['items']) {
	return items.reduce(
		(acc, item) => {
			const net = item.quantity * item.unitPrice;
			const tax = net * (item.taxRate / 100);
			acc.net += net;
			acc.tax += tax;
			acc.gross += net + tax;
			return acc;
		},
		{ net: 0, tax: 0, gross: 0 }
	);
}

export async function markInvoiceStatus(id: number, status: Invoice['status']) {
	const invoice = await prisma.invoice.findUnique({
		where: { id },
		select: { status: true, pdfPath: true, number: true, webdavStoredAt: true }
	});

	if (!invoice) {
		throw new Error('Invoice not found');
	}

	// If transitioning from DRAFT to SENT, upload to WebDAV if configured
	if (invoice.status === 'DRAFT' && status === 'SENT' && isWebDAVConfigured()) {
		if (!invoice.pdfPath) {
			throw new Error('Cannot upload to WebDAV: PDF not found');
		}

		if (invoice.webdavStoredAt) {
			log.warn(
				{ invoiceId: id, invoiceNumber: invoice.number },
				'Invoice already stored to WebDAV, skipping upload'
			);
		} else {
			try {
				await uploadInvoiceToWebDAV(invoice.number, invoice.pdfPath);
				log.info(
					{ invoiceId: id, invoiceNumber: invoice.number },
					'Invoice PDF uploaded to WebDAV'
				);
			} catch (error) {
				log.error(
					{ err: error, invoiceId: id, invoiceNumber: invoice.number },
					'Failed to upload invoice to WebDAV'
				);
				throw new Error(`Failed to upload invoice to WebDAV: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}
	}

	return prisma.invoice.update({
		where: { id },
		data: {
			status,
			// Set webdavStoredAt when transitioning to SENT if WebDAV is configured
			...(invoice.status === 'DRAFT' && status === 'SENT' && isWebDAVConfigured()
				? { webdavStoredAt: new Date() }
				: {})
		}
	});
}
