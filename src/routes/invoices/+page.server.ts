import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { z } from 'zod';
import { fail, redirect } from '@sveltejs/kit';
import { createInvoice, markInvoiceStatus } from '$lib/server/invoices';
import { generateZugferdArtifacts } from '$lib/server/zugferd';
import { sendInvoiceEmail } from '$lib/server/mailer';
import { unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { InvoiceStatus } from '$lib/server/prisma/client';
import { getInvoiceOutputDir, resolveInvoiceFile } from '$lib/server/invoice-storage';
import { createLogger } from '$lib/server/logger';

const log = createLogger({ route: 'invoices' });

const itemSchema = z.object({
	description: z.string().min(2),
	quantity: z.number().positive(),
	unitPrice: z.number().positive(),
	taxRate: z.number().min(0).max(100)
});

const createSchema = z.object({
	recipientId: z.number().int().positive(),
	issueDate: z.string().optional(),
	dueDate: z.string().optional(),
	notes: z.string().optional(),
	items: z.array(itemSchema).min(1)
});

export const load: PageServerLoad = async () => {
	const [recipients, invoices, settings] = await Promise.all([
		prisma.recipient.findMany({ orderBy: { name: 'asc' } }),
		prisma.invoice.findMany({
			orderBy: { issueDate: 'desc' },
			include: { recipient: true, lineItems: true }
		}),
		prisma.settings.findUnique({ where: { id: 1 } })
	]);

	// Convert Prisma Decimal to number for serialization
	const serializableSettings = settings
		? {
				...settings,
				defaultTaxRate: settings.defaultTaxRate ? Number(settings.defaultTaxRate) : null
			}
		: null;

	// Convert invoice Decimal fields to numbers
	const serializableInvoices = invoices.map(invoice => ({
		...invoice,
		totalNet: Number(invoice.totalNet),
		totalTax: Number(invoice.totalTax),
		totalGross: Number(invoice.totalGross),
		lineItems: invoice.lineItems.map(item => ({
			...item,
			quantity: Number(item.quantity),
			unitPrice: Number(item.unitPrice),
			taxRate: Number(item.taxRate)
		}))
	}));

	return { recipients, invoices: serializableInvoices, settings: serializableSettings };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const payload = form.get('payload');
		if (!payload || typeof payload !== 'string') {
			return fail(400, { message: 'Ungültige Daten' });
		}

		let parsedJson;
		try {
			parsedJson = JSON.parse(payload);
		} catch {
			return fail(400, { message: 'JSON Fehler' });
		}

		const parsed = createSchema.safeParse(parsedJson);
		if (!parsed.success) {
			return fail(400, { errors: parsed.error.flatten().fieldErrors });
		}

		await createInvoice(parsed.data);
		throw redirect(303, '/invoices');
	},
	regenerate: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('invoiceId'));
		if (!id) return fail(400, { message: 'ID fehlt' });
		try {
			const artifacts = await generateZugferdArtifacts(id);
			await prisma.invoice.update({
				where: { id },
				data: artifacts
			});
			return { success: true, message: 'ZUGFeRD erfolgreich neu generiert!' };
		} catch (error) {
			log.error({ err: error, invoiceId: id }, 'Failed to regenerate invoice');
			return fail(500, { error: 'Fehler beim Generieren der Rechnung' });
		}
	},
	send: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('invoiceId'));
		if (!id) return fail(400, { message: 'ID fehlt' });
		try {
			await sendInvoiceEmail(id);
			await markInvoiceStatus(id, 'SENT');
			return { success: true, message: 'Rechnung erfolgreich versendet!' };
		} catch (error) {
			log.error({ err: error, invoiceId: id }, 'Failed to send invoice email');
			return fail(500, { error: 'Fehler beim Versenden der Rechnung' });
		}
	},
	status: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('invoiceId'));
		const status = form.get('status');
		if (!id || typeof status !== 'string') return fail(400, { message: 'Ungültig' });
		try {
			await markInvoiceStatus(id, status as InvoiceStatus);
			return { success: true, message: 'Status erfolgreich aktualisiert!' };
		} catch (error) {
			log.error({ err: error, invoiceId: id, status }, 'Failed to update invoice status');
			return fail(500, { error: 'Fehler beim Aktualisieren des Status' });
		}
	},
	delete: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('invoiceId'));
		if (!id) return fail(400, { message: 'ID fehlt' });
		try {
			// Get invoice to find file paths
			const invoice = await prisma.invoice.findUnique({
				where: { id },
				select: { number: true, pdfPath: true, xmlPath: true }
			});

			if (!invoice) {
				return fail(404, { error: 'Rechnung nicht gefunden' });
			}

			// Delete invoice (line items will be deleted automatically due to cascade)
			await prisma.invoice.delete({ where: { id } });

			// Delete associated files if they exist
			if (invoice.pdfPath) {
				const pdfPath = resolveInvoiceFile(invoice.pdfPath);
				if (pdfPath && existsSync(pdfPath)) {
					await unlink(pdfPath).catch(err => {
						log.error({ err, invoiceNumber: invoice.number }, 'Failed to delete invoice PDF');
					});
				}
			}
			if (invoice.xmlPath) {
				const xmlPath = resolveInvoiceFile(invoice.xmlPath);
				if (xmlPath && existsSync(xmlPath)) {
					await unlink(xmlPath).catch(err => {
						log.error({ err, invoiceNumber: invoice.number }, 'Failed to delete invoice XML');
					});
				}
			}

			// Try to delete the invoice folder if it exists
			const invoiceFolder = path.join(getInvoiceOutputDir(), invoice.number);
			if (existsSync(invoiceFolder)) {
				const { rm } = await import('node:fs/promises');
				await rm(invoiceFolder, { recursive: true, force: true }).catch(err => {
					log.error({ err, invoiceNumber: invoice.number }, 'Failed to delete invoice folder');
				});
			}

			return { success: true, message: 'Rechnung erfolgreich gelöscht!' };
		} catch (error) {
			log.error({ err: error, invoiceId: id }, 'Failed to delete invoice');
			return fail(500, { error: 'Fehler beim Löschen der Rechnung' });
		}
	}
};
