import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleOidcCallback } from '$lib/server/oidc';
import { SESSION_COOKIE, getSessionCookieAttributes } from '$lib/server/auth';
import { recordLoginAttempt } from '$lib/server/login-attempts';
import { createLogger } from '$lib/server/logger';

const log = createLogger({ route: 'oidc-callback' });

export const GET: RequestHandler = async ({ url, cookies, getClientAddress, request }) => {
	const error = url.searchParams.get('error');

	if (error) {
		throw redirect(303, `/login?error=${encodeURIComponent(error)}`);
	}

	const storedState = cookies.get('oidc_state');
	const storedNonce = cookies.get('oidc_nonce');
	const storedCodeVerifier = cookies.get('oidc_code_verifier');
	const nextUrl = cookies.get('oidc_next') || '/';

	// Clean up cookies
	cookies.delete('oidc_state', { path: '/' });
	cookies.delete('oidc_nonce', { path: '/' });
	cookies.delete('oidc_code_verifier', { path: '/' });
	cookies.delete('oidc_next', { path: '/' });

	if (!storedState || !storedNonce || !storedCodeVerifier) {
		throw redirect(303, '/login?error=session_expired');
	}

	const ipAddress = getClientAddress();
	const userAgent = request.headers.get('user-agent');

	try {
		const { session, user } = await handleOidcCallback(
			url,
			storedCodeVerifier,
			storedState,
			storedNonce
		);
		cookies.set(SESSION_COOKIE, session.id, getSessionCookieAttributes(session.expiresAt));
		await recordLoginAttempt({
			email: user.email,
			success: true,
			userId: user.id,
			ipAddress,
			userAgent
		});
		throw redirect(303, nextUrl);
	} catch (error) {
		await recordLoginAttempt({
			email: 'oidc',
			success: false,
			ipAddress,
			userAgent
		});
		log.error({ err: error }, 'OIDC callback error');
		const errorMessage = error instanceof Error ? error.message : 'unknown_error';
		throw redirect(303, `/login?error=${encodeURIComponent(errorMessage)}`);
	}
};
