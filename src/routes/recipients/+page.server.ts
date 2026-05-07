import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { z } from 'zod';
import { fail, redirect } from '@sveltejs/kit';
import { createLogger } from '$lib/server/logger';

const log = createLogger({ route: 'recipients' });

const recipientSchema = z.object({
	isLegalEntity: z.union([z.literal('on'), z.literal('true')]).optional(),
	name: z.string().min(2),
	company: z.string().optional(),
	email: z.string().email().optional().or(z.literal('')),
	street: z.string().optional(),
	postalCode: z.string().optional(),
	city: z.string().optional(),
	country: z
		.string()
		.trim()
		.min(2, { message: 'Land ist ein Pflichtfeld' })
		.transform(value => value.toUpperCase())
});
const recipientUpdateSchema = recipientSchema.extend({
	recipientId: z.coerce.number().int().positive()
});

const toOptionalString = (value?: string) => {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
};

export const load: PageServerLoad = async () => {
	const recipients = await prisma.recipient.findMany({
		orderBy: { createdAt: 'desc' }
	});

	return { recipients };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const form = Object.fromEntries(formData);
		const parsed = recipientSchema.safeParse(form);
		if (!parsed.success) {
			return fail(400, { errors: parsed.error.flatten().fieldErrors });
		}

		const data = parsed.data;
		await prisma.recipient.create({
			data: {
				isLegalEntity: formData.has('isLegalEntity'),
				name: data.name,
				company: toOptionalString(data.company),
				email: toOptionalString(data.email),
				street: toOptionalString(data.street),
				postalCode: toOptionalString(data.postalCode),
				city: toOptionalString(data.city),
				country: data.country
			}
		});

		throw redirect(303, '/recipients');
	},
	update: async ({ request }) => {
		const formData = await request.formData();
		const form = Object.fromEntries(formData);
		const parsed = recipientUpdateSchema.safeParse(form);
		if (!parsed.success) {
			return fail(400, { errors: parsed.error.flatten().fieldErrors });
		}

		const data = parsed.data;
		await prisma.recipient.update({
			where: { id: data.recipientId },
			data: {
				isLegalEntity: formData.has('isLegalEntity'),
				name: data.name,
				company: toOptionalString(data.company),
				email: toOptionalString(data.email),
				street: toOptionalString(data.street),
				postalCode: toOptionalString(data.postalCode),
				city: toOptionalString(data.city),
				country: data.country
			}
		});

		return { success: true, message: 'Empfänger erfolgreich aktualisiert!' };
	},
	delete: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('recipientId'));
		if (!id) return fail(400, { message: 'ID fehlt' });
		try {
			// Check if recipient has any invoices
			const invoiceCount = await prisma.invoice.count({
				where: { recipientId: id }
			});

			if (invoiceCount > 0) {
				return fail(400, {
					error: `Dieser Empfänger kann nicht gelöscht werden, da ${invoiceCount} Rechnung(en) vorhanden ${invoiceCount === 1 ? 'ist' : 'sind'}.`
				});
			}

			// Delete recipient
			await prisma.recipient.delete({ where: { id } });

			return { success: true, message: 'Empfänger erfolgreich gelöscht!' };
		} catch (error) {
			log.error({ err: error, recipientId: id }, 'Failed to delete recipient');
			return fail(500, { error: 'Fehler beim Löschen des Empfängers' });
		}
	}
};
