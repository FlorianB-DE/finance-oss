import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleOidcCallback } from '$lib/server/oidc';
import { SESSION_COOKIE, getSessionCookieAttributes } from '$lib/server/auth';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ url, cookies, request }) => {
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

	try {
		const { session } = await handleOidcCallback(
			url,
			storedCodeVerifier,
			storedState,
			storedNonce
		);
		cookies.set(SESSION_COOKIE, session.id, getSessionCookieAttributes(session.expiresAt));
		throw redirect(303, nextUrl);
	} catch (error) {
		console.error('OIDC callback error:', error);
		const errorMessage = error instanceof Error ? error.message : 'unknown_error';
		throw redirect(303, `/login?error=${encodeURIComponent(errorMessage)}`);
	}
};

