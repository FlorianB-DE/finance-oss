import { prisma } from '$lib/server/prisma';
import {
	startOfMonth,
	addMonths,
	endOfMonth,
	isBefore,
	isAfter,
	setDate,
	getDaysInMonth
} from 'date-fns';

export async function getAllExpenses() {
	const expenses = await prisma.monthlyExpense.findMany({
		orderBy: { dayOfMonth: 'asc' }
	});

	return expenses.map(expense => ({
		...expense,
		amount: Number(expense.amount)
	}));
}

export async function createExpense(data: { name: string; amount: number; dayOfMonth: number }) {
	if (data.dayOfMonth < 1 || data.dayOfMonth > 31) {
		throw new Error('Tag des Monats muss zwischen 1 und 31 liegen');
	}

	// Calculate first occurrence: if dayOfMonth has passed this month, use next month, otherwise use this month
	const now = new Date();
	const currentMonth = startOfMonth(now);
	const daysInCurrentMonth = getDaysInMonth(currentMonth);
	const actualDay = Math.min(data.dayOfMonth, daysInCurrentMonth);
	const thisMonthOccurrence = setDate(currentMonth, actualDay);
	
	let firstOccurrence: Date;
	if (thisMonthOccurrence < now) {
		// Day has passed this month, use next month
		firstOccurrence = setDate(addMonths(currentMonth, 1), Math.min(data.dayOfMonth, getDaysInMonth(addMonths(currentMonth, 1))));
	} else {
		// Day hasn't passed yet this month, use this month
		firstOccurrence = thisMonthOccurrence;
	}

	return prisma.monthlyExpense.create({
		data: {
			name: data.name,
			amount: data.amount,
			dayOfMonth: data.dayOfMonth,
			firstOccurrence
		}
	});
}

export async function updateExpense(
	id: number,
	data: {
		name?: string;
		amount?: number;
		dayOfMonth?: number;
		firstOccurrence?: Date | string;
		active?: boolean;
	}
) {
	if (data.dayOfMonth !== undefined && (data.dayOfMonth < 1 || data.dayOfMonth > 31)) {
		throw new Error('Tag des Monats muss zwischen 1 und 31 liegen');
	}

	const updateData: any = { ...data };
	if (data.firstOccurrence !== undefined) {
		updateData.firstOccurrence = typeof data.firstOccurrence === 'string' 
			? new Date(data.firstOccurrence) 
			: data.firstOccurrence;
	}

	return prisma.monthlyExpense.update({
		where: { id },
		data: updateData
	});
}

export async function deleteExpense(id: number) {
	return prisma.monthlyExpense.delete({
		where: { id }
	});
}

export async function getAllSingleExpenses() {
	const expenses = await prisma.singleExpense.findMany({
		orderBy: { date: 'asc' }
	});

	return expenses.map(expense => ({
		...expense,
		amount: Number(expense.amount),
		date: expense.date
	}));
}

export async function createSingleExpense(data: {
	name: string;
	amount: number;
	date: Date | string;
}) {
	const expenseDate = typeof data.date === 'string' ? new Date(data.date) : data.date;

	return prisma.singleExpense.create({
		data: {
			name: data.name,
			amount: data.amount,
			date: expenseDate
		}
	});
}

export async function updateSingleExpense(
	id: number,
	data: {
		name?: string;
		amount?: number;
		date?: Date | string;
		active?: boolean;
	}
) {
	if (data.date !== undefined && typeof data.date === 'string') {
		data.date = new Date(data.date);
	}

	return prisma.singleExpense.update({
		where: { id },
		data: data
	});
}

export async function deleteSingleExpense(id: number) {
	return prisma.singleExpense.delete({
		where: { id }
	});
}

export type ForecastEntry = {
	date: Date;
	balance: number;
	income: number;
	expenses: number;
	transactions: Array<{
		date: Date;
		description: string;
		amount: number;
		type: 'income' | 'expense';
	}>;
};

export async function generateForecast(
	startingBalance: number,
	monthsAhead: number = 12
): Promise<ForecastEntry[]> {
	const expenses = await getAllExpenses();
	const activeExpenses = expenses.filter(e => e.active);

	const singleExpenses = await getAllSingleExpenses();
	const activeSingleExpenses = singleExpenses.filter(e => e.active);

	// Get all invoices (paid and sent) for income projection
	// We assume sent invoices will be paid on their due date
	const invoices = await prisma.invoice.findMany({
		where: {
			status: {
				in: ['PAID', 'SENT']
			}
		},
		orderBy: { dueDate: 'asc' }
	});

	const startDate = startOfMonth(new Date());
	const forecast: ForecastEntry[] = [];
	let currentBalance = startingBalance;

	// Generate forecast for each month
	for (let monthOffset = 0; monthOffset < monthsAhead; monthOffset++) {
		const monthStart = addMonths(startDate, monthOffset);
		const monthEnd = endOfMonth(monthStart);
		const transactions: ForecastEntry['transactions'] = [];

		// Add income from invoices due in this month
		const monthIncome = invoices
			.filter(invoice => {
				const dueDate = new Date(invoice.dueDate);
				dueDate.setHours(0, 0, 0, 0);
				return !isBefore(dueDate, monthStart) && !isAfter(dueDate, monthEnd);
			})
			.reduce((sum, invoice) => {
				const amount = Number(invoice.totalGross);
				const dueDate = new Date(invoice.dueDate);
				dueDate.setHours(0, 0, 0, 0);
				transactions.push({
					date: dueDate,
					description: `Rechnung ${invoice.number}`,
					amount,
					type: 'income'
				});
				return sum + amount;
			}, 0);

		// Add recurring monthly expenses for this month
		const monthRecurringExpenses = activeExpenses.reduce((sum, expense) => {
			// Calculate the date this expense occurs in this month
			// Handle dayOfMonth > days in month by using the last day of the month
			const daysInMonth = getDaysInMonth(monthStart);
			const expenseDay = Math.min(expense.dayOfMonth, daysInMonth);
			const expenseDate = setDate(monthStart, expenseDay);
			const firstOccurrence = new Date(expense.firstOccurrence);
			firstOccurrence.setHours(0, 0, 0, 0);
			expenseDate.setHours(0, 0, 0, 0);

			// Only include if the expense date is on or after firstOccurrence
			if (expenseDate.getTime() >= firstOccurrence.getTime()) {
				transactions.push({
					date: expenseDate,
					description: expense.name,
					amount: expense.amount,
					type: 'expense'
				});

				return sum + expense.amount;
			}

			return sum;
		}, 0);

		// Add single expenses that fall within this month
		const monthSingleExpenses = activeSingleExpenses
			.filter(expense => {
				const expenseDate = new Date(expense.date);
				expenseDate.setHours(0, 0, 0, 0);
				return !isBefore(expenseDate, monthStart) && !isAfter(expenseDate, monthEnd);
			})
			.reduce((sum, expense) => {
				const expenseDate = new Date(expense.date);
				expenseDate.setHours(0, 0, 0, 0);
				transactions.push({
					date: expenseDate,
					description: expense.name,
					amount: expense.amount,
					type: 'expense'
				});
				return sum + expense.amount;
			}, 0);

		const monthExpenses = monthRecurringExpenses + monthSingleExpenses;

		// Sort transactions by date
		transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

		// Calculate balance at end of month
		currentBalance = currentBalance + monthIncome - monthExpenses;

		forecast.push({
			date: monthEnd,
			balance: currentBalance,
			income: monthIncome,
			expenses: monthExpenses,
			transactions
		});
	}

	return forecast;
}
