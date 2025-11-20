import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const GET: RequestHandler = async ({ params }) => {
	const invoice = await prisma.invoice.findUnique({
		where: { number: params.number }
	});

	if (!invoice?.pdfPath) {
		return new Response('Nicht gefunden', { status: 404 });
	}

	const file = await readFile(path.resolve('static', invoice.pdfPath));

	return new Response(file, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="Rechnung-${invoice.number}.pdf"`
		}
	});
};
