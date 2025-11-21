import { prisma } from '$lib/server/prisma';
import type { Invoice } from '$lib/server/prisma/client';
import { getNextInvoiceNumber } from '$lib/server/settings';
import { addDays } from 'date-fns';
import { generateZugferdArtifacts } from '$lib/server/zugferd';

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
	return prisma.invoice.update({
		where: { id },
		data: { status }
	});
}
