import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { getOrCreateSettings } from '$lib/server/settings';

export const load: PageServerLoad = async () => {
	const [settings, stats, invoices] = await Promise.all([
		getOrCreateSettings(),
		prisma.invoice.aggregate({
			_sum: { totalGross: true },
			_count: { _all: true }
		}),
		prisma.invoice.findMany({
			orderBy: { issueDate: 'desc' },
			take: 5,
			include: { recipient: true }
		})
	]);

	// Convert Prisma Decimal to number for serialization
	const serializableSettings = {
		...settings,
		defaultTaxRate: settings.defaultTaxRate ? Number(settings.defaultTaxRate) : null
	};

	// Convert invoice Decimal fields to numbers
	const serializableInvoices = invoices.map(invoice => ({
		...invoice,
		totalNet: Number(invoice.totalNet),
		totalTax: Number(invoice.totalTax),
		totalGross: Number(invoice.totalGross)
	}));

	return {
		settings: serializableSettings,
		stats: {
			count: stats._count._all,
			gross: Number(stats._sum.totalGross ?? 0)
		},
		invoices: serializableInvoices
	};
};
