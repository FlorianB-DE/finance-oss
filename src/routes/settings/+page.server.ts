import type { Actions, PageServerLoad } from './$types';
import { getOrCreateSettings, updateSettings } from '$lib/server/settings';
import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import { Prisma } from '$lib/server/prisma/client';
import { createLogger } from '$lib/server/logger';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import {
	getTemplateOutputDir,
	listTemplateFiles,
	resolveTemplateFile,
	safeTemplateBasename
} from '$lib/server/template-storage';
import { INVOICE_BODY_PLACEHOLDER } from '$lib/server/invoice-template-html';

const log = createLogger({ route: 'settings' });

const MAX_TEMPLATE_BYTES = 2 * 1024 * 1024;

const schema = z.object({
	personName: z.string().optional(),
	companyName: z.string().optional(),
	legalStatus: z.string().optional(),
	defaultTaxRate: z.coerce.number().min(0).max(100).optional(),
	taxNumber: z.string().optional(),
	wirtschaftsIdentNr: z.string().optional(),
	street: z.string().optional(),
	postalCode: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
	iban: z.string().optional(),
	bic: z.string().optional(),
	emailFrom: z.union([z.string().email(), z.literal('')]).optional(),
	smtpHost: z.string().optional(),
	smtpPort: z.coerce.number().optional(),
	smtpUser: z.string().optional(),
	smtpPassword: z.string().optional(),
	emailSignature: z.string().optional(),
	invoicePrefix: z.string().optional(),
	overrideInvoiceStartNumber: z.coerce.number().min(0).int().optional()
});

export const load: PageServerLoad = async () => {
	const settings = await getOrCreateSettings();
	const templateFiles = await listTemplateFiles();
	// Convert Prisma Decimal to number for serialization
	const serializableSettings = {
		...settings,
		defaultTaxRate: settings.defaultTaxRate ? Number(settings.defaultTaxRate) : null,
		startingBalance: settings.startingBalance ? Number(settings.startingBalance) : 0
	};
	return { settings: serializableSettings, templateFiles };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const form = Object.fromEntries(await request.formData());
		const parsed = schema.safeParse(form);
		if (!parsed.success) {
			return fail(400, { errors: parsed.error.flatten().fieldErrors, values: form });
		}

		const payload = parsed.data;

		// Filter out empty strings and undefined values, convert empty strings to null for optional fields
		const sanitized: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(payload)) {
			if (value === undefined) continue;

			// Convert empty strings to null for optional string fields
			if (typeof value === 'string' && value.trim() === '') {
				sanitized[key] = null;
			} else {
				sanitized[key] = value;
			}
		}

		// Handle special numeric fields
		if (typeof payload.defaultTaxRate === 'number') {
			sanitized.defaultTaxRate = new Prisma.Decimal(payload.defaultTaxRate);
		} else if (payload.defaultTaxRate === undefined) {
			// Don't include it if not provided
			delete sanitized.defaultTaxRate;
		}

		if (typeof payload.smtpPort === 'number' && !Number.isNaN(payload.smtpPort)) {
			sanitized.smtpPort = payload.smtpPort;
		} else if (payload.smtpPort === undefined) {
			delete sanitized.smtpPort;
		}

		if (
			typeof payload.overrideInvoiceStartNumber === 'number' &&
			!Number.isNaN(payload.overrideInvoiceStartNumber)
		) {
			sanitized.overrideInvoiceStartNumber = payload.overrideInvoiceStartNumber;
		} else if (payload.overrideInvoiceStartNumber === undefined) {
			delete sanitized.overrideInvoiceStartNumber;
		}

		try {
			await updateSettings(sanitized);
			return { success: true };
		} catch (error) {
			log.error({ err: error }, 'Failed to update settings');
			return fail(500, { error: 'Fehler beim Speichern der Einstellungen' });
		}
	},
	uploadTemplate: async ({ request }) => {
		const form = await request.formData();
		const entry = form.get('template');
		if (!entry || typeof entry === 'string') {
			return fail(400, { templateError: 'Bitte eine HTML-Datei auswählen.' });
		}

		const buffer = Buffer.from(await entry.arrayBuffer());
		if (buffer.length === 0) {
			return fail(400, { templateError: 'Die Datei ist leer.' });
		}
		if (buffer.length > MAX_TEMPLATE_BYTES) {
			return fail(400, { templateError: 'Die Datei ist zu groß (max. 2 MB).' });
		}

		const safeName = safeTemplateBasename(entry.name);
		if (!safeName) {
			return fail(400, { templateError: 'Nur .html- oder .htm-Dateien sind erlaubt.' });
		}

		const text = buffer.toString('utf-8');
		if (!text.includes(INVOICE_BODY_PLACEHOLDER)) {
			return fail(400, {
				templateError: `Die Vorlage muss den Platzhalter ${INVOICE_BODY_PLACEHOLDER} enthalten.`
			});
		}

		try {
			const dir = getTemplateOutputDir();
			await mkdir(dir, { recursive: true });
			await writeFile(path.join(dir, safeName), buffer);
			return { templateSuccess: true, templateMessage: `Vorlage „${safeName}“ wurde gespeichert.` };
		} catch (error) {
			log.error({ err: error }, 'Failed to save invoice template');
			return fail(500, { templateError: 'Vorlage konnte nicht gespeichert werden.' });
		}
	},
	selectTemplate: async ({ request }) => {
		const form = await request.formData();
		const raw = form.get('invoiceTemplatePath');
		const value = raw === null || raw === undefined ? '' : String(raw).trim();

		if (value === '') {
			try {
				await updateSettings({ invoiceTemplatePath: null });
				return {
					templateSuccess: true,
					templateMessage: 'Es wird wieder die Standard-Rechnungsvorlage verwendet.'
				};
			} catch (error) {
				log.error({ err: error }, 'Failed to clear invoice template');
				return fail(500, { templateError: 'Auswahl konnte nicht gespeichert werden.' });
			}
		}

		const basename = path.basename(value);
		const abs = resolveTemplateFile(basename);
		if (!abs || !existsSync(abs)) {
			return fail(400, { templateError: 'Die gewählte Vorlage existiert nicht.' });
		}

		try {
			await updateSettings({ invoiceTemplatePath: basename });
			return { templateSuccess: true, templateMessage: `Aktive Vorlage: ${basename}` };
		} catch (error) {
			log.error({ err: error }, 'Failed to set invoice template');
			return fail(500, { templateError: 'Auswahl konnte nicht gespeichert werden.' });
		}
	},
	deleteTemplate: async ({ request }) => {
		const form = await request.formData();
		const raw = form.get('filename');
		if (typeof raw !== 'string' || !raw.trim()) {
			return fail(400, { templateError: 'Ungültiger Dateiname.' });
		}
		const basename = path.basename(raw.trim());
		const abs = resolveTemplateFile(basename);
		if (!abs || !existsSync(abs)) {
			return fail(400, { templateError: 'Datei nicht gefunden.' });
		}

		try {
			await unlink(abs);
			const settings = await getOrCreateSettings();
			if (settings.invoiceTemplatePath === basename) {
				await updateSettings({ invoiceTemplatePath: null });
			}
			return { templateSuccess: true, templateMessage: `„${basename}“ wurde gelöscht.` };
		} catch (error) {
			log.error({ err: error, basename }, 'Failed to delete invoice template');
			return fail(500, { templateError: 'Vorlage konnte nicht gelöscht werden.' });
		}
	}
};
