import type { RequestHandler } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSession } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) {
		await deleteSession(token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
	}

	throw redirect(303, '/login');
};
