import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOidcConfig, generateAuthUrl, generators } from '$lib/server/oidc';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const oidcConfig = await getOidcConfig();
	if (!oidcConfig) {
		throw redirect(303, '/login?error=oidc_not_configured');
	}

	const state = generators.state();
	const nonce = generators.nonce();
	const codeVerifier = generators.codeVerifier();

	// Store state, nonce, and codeVerifier in cookies for verification
	cookies.set('oidc_state', state, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 600 // 10 minutes
	});

	cookies.set('oidc_nonce', nonce, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 600 // 10 minutes
	});

	cookies.set('oidc_code_verifier', codeVerifier, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 600
	});

	const nextUrl = url.searchParams.get('next') || '/';
	cookies.set('oidc_next', nextUrl, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 600
	});

	const authUrl = await generateAuthUrl(state, nonce, codeVerifier);
	throw redirect(303, authUrl.href);
};

