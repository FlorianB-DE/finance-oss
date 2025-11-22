import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import {
	getAllExpenses,
	createExpense,
	updateExpense,
	deleteExpense,
	getAllSingleExpenses,
	createSingleExpense,
	updateSingleExpense,
	deleteSingleExpense,
	generateForecast
} from '$lib/server/expenses';
import { prisma } from '$lib/server/prisma';
import { createLogger } from '$lib/server/logger';

const log = createLogger({ route: 'planner' });

const expenseSchema = z.object({
	name: z.string().min(1, 'Name ist erforderlich'),
	amount: z.number().positive('Betrag muss positiv sein'),
	dayOfMonth: z.number().int().min(1).max(31, 'Tag muss zwischen 1 und 31 liegen')
});

const singleExpenseSchema = z.object({
	name: z.string().min(1, 'Name ist erforderlich'),
	amount: z.number().positive('Betrag muss positiv sein'),
	date: z.string().min(1, 'Datum ist erforderlich')
});

export const load: PageServerLoad = async () => {
	const [expenses, singleExpenses, settings] = await Promise.all([
		getAllExpenses(),
		getAllSingleExpenses(),
		prisma.settings.findUnique({ where: { id: 1 } })
	]);

	const startingBalance = settings?.startingBalance ? Number(settings.startingBalance) : 0;

	const forecast = await generateForecast(startingBalance, 12);

	return {
		expenses,
		singleExpenses: singleExpenses.map(expense => ({
			...expense,
			date: expense.date.toISOString()
		})),
		startingBalance,
		forecast: forecast.map(entry => ({
			...entry,
			date: entry.date.toISOString(),
			transactions: entry.transactions.map(t => ({
				...t,
				date: t.date.toISOString()
			}))
		}))
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name');
		const amount = form.get('amount');
		const dayOfMonth = form.get('dayOfMonth');

		if (!name || !amount || !dayOfMonth) {
			return fail(400, { error: 'Alle Felder sind erforderlich' });
		}

		const parsed = expenseSchema.safeParse({
			name: name.toString(),
			amount: Number(amount),
			dayOfMonth: Number(dayOfMonth)
		});

		if (!parsed.success) {
			return fail(400, { errors: parsed.error.flatten().fieldErrors });
		}

		try {
			await createExpense(parsed.data);
			return { success: true, message: 'Ausgabe erfolgreich erstellt!' };
		} catch (error) {
			log.error({ err: error, data: parsed.data }, 'Failed to create expense');
			return fail(500, {
				error: error instanceof Error ? error.message : 'Fehler beim Erstellen der Ausgabe'
			});
		}
	},
	update: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id');
		const name = form.get('name');
		const amount = form.get('amount');
		const dayOfMonth = form.get('dayOfMonth');
		const active = form.get('active');

		if (!id) {
			return fail(400, { error: 'ID fehlt' });
		}

		const updateData: {
			name?: string;
			amount?: number;
			dayOfMonth?: number;
			active?: boolean;
		} = {};

		if (name) updateData.name = name.toString();
		if (amount) updateData.amount = Number(amount);
		if (dayOfMonth) updateData.dayOfMonth = Number(dayOfMonth);
		if (active !== null) updateData.active = active === 'true' || active === 'on';

		try {
			await updateExpense(Number(id), updateData);
			return { success: true, message: 'Ausgabe erfolgreich aktualisiert!' };
		} catch (error) {
			log.error({ err: error, expenseId: Number(id), updateData }, 'Failed to update expense');
			return fail(500, {
				error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Ausgabe'
			});
		}
	},
	delete: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id');

		if (!id) {
			return fail(400, { error: 'ID fehlt' });
		}

		try {
			await deleteExpense(Number(id));
			return { success: true, message: 'Ausgabe erfolgreich gelöscht!' };
		} catch (error) {
			log.error({ err: error, expenseId: Number(id) }, 'Failed to delete expense');
			return fail(500, {
				error: error instanceof Error ? error.message : 'Fehler beim Löschen der Ausgabe'
			});
		}
	},
	updateBalance: async ({ request }) => {
		const form = await request.formData();
		const startingBalance = form.get('startingBalance');

		if (!startingBalance) {
			return fail(400, { error: 'Startguthaben ist erforderlich' });
		}

		const balance = Number(startingBalance);
		if (isNaN(balance)) {
			return fail(400, { error: 'Ungültiger Betrag' });
		}

		try {
			await prisma.settings.upsert({
				where: { id: 1 },
				update: { startingBalance: balance },
				create: { id: 1, startingBalance: balance }
			});
			return { success: true, message: 'Startguthaben erfolgreich aktualisiert!' };
		} catch (error) {
			log.error({ err: error, balance }, 'Failed to update starting balance');
			return fail(500, { error: 'Fehler beim Aktualisieren des Startguthabens' });
		}
	},
	createSingle: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name');
		const amount = form.get('amount');
		const date = form.get('date');

		if (!name || !amount || !date) {
			return fail(400, { error: 'Alle Felder sind erforderlich' });
		}

		const parsed = singleExpenseSchema.safeParse({
			name: name.toString(),
			amount: Number(amount),
			date: date.toString()
		});

		if (!parsed.success) {
			return fail(400, { errors: parsed.error.flatten().fieldErrors });
		}

		try {
			await createSingleExpense(parsed.data);
			return { success: true, message: 'Einmalige Ausgabe erfolgreich erstellt!' };
		} catch (error) {
			log.error({ err: error, data: parsed.data }, 'Failed to create single expense');
			return fail(500, {
				error: error instanceof Error ? error.message : 'Fehler beim Erstellen der Ausgabe'
			});
		}
	},
	updateSingle: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id');
		const name = form.get('name');
		const amount = form.get('amount');
		const date = form.get('date');
		const active = form.get('active');

		if (!id) {
			return fail(400, { error: 'ID fehlt' });
		}

		const updateData: {
			name?: string;
			amount?: number;
			date?: string;
			active?: boolean;
		} = {};

		if (name) updateData.name = name.toString();
		if (amount) updateData.amount = Number(amount);
		if (date) updateData.date = date.toString();
		if (active !== null) updateData.active = active === 'true' || active === 'on';

		try {
			await updateSingleExpense(Number(id), updateData);
			return { success: true, message: 'Einmalige Ausgabe erfolgreich aktualisiert!' };
		} catch (error) {
			log.error(
				{ err: error, expenseId: Number(id), updateData },
				'Failed to update single expense'
			);
			return fail(500, {
				error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Ausgabe'
			});
		}
	},
	deleteSingle: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id');

		if (!id) {
			return fail(400, { error: 'ID fehlt' });
		}

		try {
			await deleteSingleExpense(Number(id));
			return { success: true, message: 'Einmalige Ausgabe erfolgreich gelöscht!' };
		} catch (error) {
			log.error({ err: error, expenseId: Number(id) }, 'Failed to delete single expense');
			return fail(500, {
				error: error instanceof Error ? error.message : 'Fehler beim Löschen der Ausgabe'
			});
		}
	}
};
