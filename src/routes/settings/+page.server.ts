import type { Actions, PageServerLoad } from './$types';
import { getOrCreateSettings, updateSettings } from '$lib/server/settings';
import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import { Prisma } from '$lib/server/prisma/client';
import { createLogger } from '$lib/server/logger';

const log = createLogger({ route: 'settings' });

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
	// Convert Prisma Decimal to number for serialization
	const serializableSettings = {
		...settings,
		defaultTaxRate: settings.defaultTaxRate ? Number(settings.defaultTaxRate) : null,
		startingBalance: settings.startingBalance ? Number(settings.startingBalance) : 0
	};
	return { settings: serializableSettings };
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
	}
};
