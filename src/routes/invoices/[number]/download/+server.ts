import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { readFile } from 'node:fs/promises';
import { resolveInvoiceFile } from '$lib/server/invoice-storage';
import { createLogger } from '$lib/server/logger';

const log = createLogger({ route: 'invoice-download' });

export const GET: RequestHandler = async ({ params }) => {
	const invoice = await prisma.invoice.findUnique({
		where: { number: params.number }
	});

	if (!invoice?.pdfPath) {
		log.warn({ invoiceNumber: params.number }, 'Invoice or PDF path missing');
		return new Response('Nicht gefunden', { status: 404 });
	}

	const resolvedPath = resolveInvoiceFile(invoice.pdfPath);
	if (!resolvedPath) {
		log.error({ invoiceNumber: params.number }, 'Failed to resolve invoice PDF path');
		return new Response('Nicht gefunden', { status: 404 });
	}

	try {
		const file = await readFile(resolvedPath);

		log.info({ invoiceNumber: invoice.number, path: resolvedPath }, 'Serving invoice download');

		return new Response(file, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="Rechnung-${invoice.number}.pdf"`
			}
		});
	} catch (err) {
		log.error({ err, invoiceNumber: params.number, path: resolvedPath }, 'Failed to read invoice PDF');
		return new Response('Fehler beim Laden der Rechnung', { status: 500 });
	}
};
