import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import {
	SESSION_COOKIE,
	createSession,
	createUser,
	getUserByEmail,
	getSessionCookieAttributes,
	verifyPassword
} from '$lib/server/auth';
import { recordLoginAttempt } from '$lib/server/login-attempts';
import { createLogger } from '$lib/server/logger';
import { z } from 'zod';

const log = createLogger({ route: 'login' });

const loginSchema = z.object({
	email: z.string().email('Bitte gültige E-Mail').toLowerCase(),
	password: z.string().min(6, 'Passwort zu kurz')
});

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}

	const userCount = await prisma.user.count();

	const oidcEnabled =
		!!process.env.OIDC_ISSUER && !!process.env.OIDC_CLIENT_ID && !!process.env.OIDC_CLIENT_SECRET;

	log.info(
		{
			oidcEnabled,
			hasIssuer: !!process.env.OIDC_ISSUER,
			hasClientId: !!process.env.OIDC_CLIENT_ID,
			hasClientSecret: !!process.env.OIDC_CLIENT_SECRET
		},
		'OIDC availability check'
	);

	return {
		hasUser: userCount > 0,
		oidcEnabled
	};
};

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress }) => {
		const ipAddress = getClientAddress();
		const userAgent = request.headers.get('user-agent');

		const formData = Object.fromEntries(await request.formData());
		const parsed = loginSchema.safeParse(formData);

		if (!parsed.success) {
			await recordLoginAttempt({
				email: String(formData.email ?? 'unbekannt'),
				success: false,
				ipAddress,
				userAgent
			});
			return fail(400, { errors: parsed.error.flatten().fieldErrors });
		}

		const user = await getUserByEmail(parsed.data.email);
		if (!user) {
			await recordLoginAttempt({
				email: parsed.data.email,
				success: false,
				ipAddress,
				userAgent
			});
			return fail(400, { message: 'Unbekannter Nutzer' });
		}

		if (!user.passwordHash) {
			await recordLoginAttempt({
				email: parsed.data.email,
				success: false,
				userId: user.id,
				ipAddress,
				userAgent
			});
			return fail(400, { message: 'Dieser Nutzer verwendet OIDC-Anmeldung' });
		}

		const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
		if (!isValid) {
			await recordLoginAttempt({
				email: parsed.data.email,
				success: false,
				userId: user.id,
				ipAddress,
				userAgent
			});
			return fail(400, { message: 'Falsches Passwort' });
		}

		const session = await createSession(user.id);
		cookies.set(SESSION_COOKIE, session.id, getSessionCookieAttributes(session.expiresAt));

		await recordLoginAttempt({
			email: parsed.data.email,
			success: true,
			userId: user.id,
			ipAddress,
			userAgent
		});

		throw redirect(303, '/');
	},
	register: async ({ request, cookies }) => {
		const existing = await prisma.user.count();
		if (existing > 0) {
			return fail(403, { message: 'Registrierung deaktiviert' });
		}

		const formData = Object.fromEntries(await request.formData());
		const parsed = loginSchema.safeParse(formData);
		if (!parsed.success) {
			return fail(400, { errors: parsed.error.flatten().fieldErrors });
		}

		const user = await createUser(parsed.data.email, parsed.data.password);
		const session = await createSession(user.id);
		cookies.set(SESSION_COOKIE, session.id, getSessionCookieAttributes(session.expiresAt));

		throw redirect(303, '/');
	}
};
