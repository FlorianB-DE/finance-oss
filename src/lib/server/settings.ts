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
	const settings = await getOrCreateSettings();
	const year = new Date().getFullYear();
	const firstDayOfYear = new Date(year, 0, 1);
	const lastDayOfYear = new Date(year, 11, 31);

	const invoiceCount = await prisma.invoice.count({
		where: {
			issueDate: { gte: firstDayOfYear, lte: lastDayOfYear }
		}
	});

	const invoiceNumber = settings.overrideInvoiceStartNumber + invoiceCount;

	const padded = invoiceNumber.toString().padStart(4, '0');
	const prefix = settings.invoicePrefix?.trim() ?? 'RE';
	return `${prefix}-${year}-${padded}`;
}
