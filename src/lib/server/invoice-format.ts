import type { Prisma } from '@prisma/client';

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
	include: { recipient: true; lineItems: true };
}>;

export type RenderInvoiceLineItem = Omit<
	InvoiceWithRelations['lineItems'][number],
	'quantity' | 'unitPrice' | 'taxRate'
> & {
	quantity: number;
	unitPrice: number;
	taxRate: number;
	lineTotal: number;
};

export type RenderInvoice = Omit<
	InvoiceWithRelations,
	'lineItems' | 'totalNet' | 'totalTax' | 'totalGross'
> & {
	lineItems: RenderInvoiceLineItem[];
	totalNet: number;
	totalTax: number;
	totalGross: number;
};

export function normalizeInvoice(invoice: InvoiceWithRelations): RenderInvoice {
	return {
		...invoice,
		totalNet: Number(invoice.totalNet),
		totalTax: Number(invoice.totalTax),
		totalGross: Number(invoice.totalGross),
		lineItems: invoice.lineItems
			.slice()
			.sort((a, b) => a.position - b.position)
			.map(item => ({
				...item,
				quantity: Number(item.quantity),
				unitPrice: Number(item.unitPrice),
				taxRate: Number(item.taxRate),
				lineTotal: Number(item.quantity) * Number(item.unitPrice)
			}))
	};
}
