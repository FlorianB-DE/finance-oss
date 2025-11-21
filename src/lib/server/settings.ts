import { prisma } from '$lib/server/prisma';
import type { Settings } from '$lib/server/prisma/client';

const SETTINGS_ID = 1;

export async function getOrCreateSettings() {
	let settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
	if (!settings) {
		settings = await prisma.settings.create({
			data: { id: SETTINGS_ID }
		});
	}
	return settings;
}

export async function updateSettings(data: Partial<Settings>) {
	return prisma.settings.upsert({
		where: { id: SETTINGS_ID },
		create: { id: SETTINGS_ID, ...data },
		update: data
	});
}

export async function getNextInvoiceNumber() {
	const updated = await prisma.settings.update({
		where: { id: SETTINGS_ID },
		data: { lastInvoiceCounter: { increment: 1 } },
		select: { lastInvoiceCounter: true, invoicePrefix: true }
	});
	const prefix = updated.invoicePrefix?.trim() ?? 'RE';
	const padded = updated.lastInvoiceCounter.toString().padStart(4, '0');
	const year = new Date().getFullYear();
	return `${prefix}-${year}-${padded}`;
}
