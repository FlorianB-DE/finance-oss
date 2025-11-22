import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { getOrCreateSettings } from '$lib/server/settings';
import { generateForecast } from '$lib/server/expenses';
import { isBefore, subMonths, startOfMonth, getDaysInMonth, setDate } from 'date-fns';

export const load: PageServerLoad = async () => {
	const [settings, stats, invoices, paidInvoices, sentInvoices, draftInvoices, singleExpenses, monthlyExpenses] = await Promise.all([
		getOrCreateSettings(),
		prisma.invoice.aggregate({
			_sum: { totalGross: true },
			_count: { _all: true }
		}),
		prisma.invoice.findMany({
			orderBy: { issueDate: 'desc' },
			take: 5,
			include: { recipient: true }
		}),
		prisma.invoice.findMany({
			where: { status: 'PAID' },
			orderBy: { dueDate: 'desc' },
			take: 5,
			include: { recipient: true }
		}),
		prisma.invoice.findMany({
			where: { status: 'SENT' },
			orderBy: { dueDate: 'asc' },
			take: 10,
			include: { recipient: true }
		}),
		prisma.invoice.findMany({
			where: { status: 'DRAFT' },
			orderBy: { issueDate: 'desc' },
			take: 10,
			include: { recipient: true }
		}),
		prisma.singleExpense.findMany({
			where: { active: true },
			orderBy: { date: 'desc' }
		}),
		prisma.monthlyExpense.findMany({
			where: { active: true },
			orderBy: { dayOfMonth: 'asc' }
		})
	]);

	// Convert Prisma Decimal to number for serialization
	const serializableSettings = {
		...settings,
		defaultTaxRate: settings.defaultTaxRate ? Number(settings.defaultTaxRate) : null,
		startingBalance: settings.startingBalance ? Number(settings.startingBalance) : 0
	};

	const startingBalance = serializableSettings.startingBalance;

	// Generate forecast for the chart
	const forecast = await generateForecast(startingBalance, 12);

	// Get recent transactions: paid invoices (income), past single expenses, and past monthly expenses
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const currentDay = today.getDate();

	// Generate past monthly expense transactions (last 6 months)
	const monthlyExpenseTransactions: Array<{
		type: 'expense';
		date: Date;
		description: string;
		amount: number;
	}> = [];

	monthlyExpenses.forEach(expense => {
		const dayOfMonth = expense.dayOfMonth;
		const amount = Number(expense.amount);
		const firstOccurrence = new Date(expense.firstOccurrence);
		firstOccurrence.setHours(0, 0, 0, 0);

		// Check last 6 months
		for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
			const monthDate = subMonths(today, monthOffset);
			const monthStart = startOfMonth(monthDate);
			const daysInMonth = getDaysInMonth(monthStart);

			// Use the last day of the month if dayOfMonth exceeds the month's days
			const actualDay = Math.min(dayOfMonth, daysInMonth);
			const expenseDate = setDate(monthStart, actualDay);
			expenseDate.setHours(0, 0, 0, 0);

			// Only include if:
			// 1. The expense date is on or after firstOccurrence
			// 2. The expense date is in the past (or today)
			if (
				expenseDate.getTime() >= firstOccurrence.getTime() &&
				(isBefore(expenseDate, today) || expenseDate.getTime() === today.getTime())
			) {
				// For current month, only include if the day has passed
				if (monthOffset === 0) {
					if (actualDay <= currentDay) {
						monthlyExpenseTransactions.push({
							type: 'expense' as const,
							date: expenseDate,
							description: expense.name,
							amount
						});
					}
				} else {
					// For past months, always include
					monthlyExpenseTransactions.push({
						type: 'expense' as const,
						date: expenseDate,
						description: expense.name,
						amount
					});
				}
			}
		}
	});

	const recentTransactions = [
		// Paid invoices as income
		...invoices
			.filter(inv => inv.status === 'PAID')
			.map(inv => ({
				type: 'income' as const,
				date: new Date(inv.dueDate),
				description: `Rechnung ${inv.number}`,
				amount: Number(inv.totalGross),
				recipient: inv.recipient?.name || inv.recipient?.company || 'Unbekannt'
			})),
		// Past single expenses
		...singleExpenses
			.filter(exp => {
				const expDate = new Date(exp.date);
				expDate.setHours(0, 0, 0, 0);
				return isBefore(expDate, today) || expDate.getTime() === today.getTime();
			})
			.map(exp => ({
				type: 'expense' as const,
				date: new Date(exp.date),
				description: exp.name,
				amount: Number(exp.amount)
			})),
		// Past monthly expenses
		...monthlyExpenseTransactions
	]
		.sort((a, b) => b.date.getTime() - a.date.getTime())
		.slice(0, 3); // Get 3 most recent

	// Convert invoice Decimal fields to numbers
	const serializableInvoices = invoices.map(invoice => ({
		...invoice,
		totalNet: Number(invoice.totalNet),
		totalTax: Number(invoice.totalTax),
		totalGross: Number(invoice.totalGross)
	}));

	const serializablePaidInvoices = paidInvoices.map(invoice => ({
		...invoice,
		totalNet: Number(invoice.totalNet),
		totalTax: Number(invoice.totalTax),
		totalGross: Number(invoice.totalGross)
	}));

	const serializableSentInvoices = sentInvoices.map(invoice => ({
		...invoice,
		totalNet: Number(invoice.totalNet),
		totalTax: Number(invoice.totalTax),
		totalGross: Number(invoice.totalGross)
	}));

	const serializableDraftInvoices = draftInvoices.map(invoice => ({
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
		invoices: serializableInvoices,
		paidInvoices: serializablePaidInvoices,
		sentInvoices: serializableSentInvoices,
		draftInvoices: serializableDraftInvoices,
		forecast: forecast.map(entry => ({
			...entry,
			date: entry.date.toISOString(),
			transactions: entry.transactions.map(t => ({
				...t,
				date: t.date.toISOString()
			}))
		})),
		startingBalance,
		recentTransactions: recentTransactions.map(t => ({
			...t,
			date: t.date.toISOString()
		}))
	};
};
