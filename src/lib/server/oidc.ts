import * as oidc from 'openid-client';
import { prisma } from '$lib/server/prisma';
import { createSession } from './auth';
import { createLogger } from '$lib/server/logger';

let config: oidc.Configuration | null = null;
const log = createLogger({ module: 'oidc' });

export async function getOidcConfig() {
	if (!process.env.OIDC_ISSUER || !process.env.OIDC_CLIENT_ID || !process.env.OIDC_CLIENT_SECRET) {
		return null;
	}

	if (config) {
		return config;
	}

	try {
		const server = new URL(process.env.OIDC_ISSUER);
		const clientId = process.env.OIDC_CLIENT_ID;
		const clientSecret = process.env.OIDC_CLIENT_SECRET;

		config = await oidc.discovery(server, clientId, clientSecret);

		return config;
	} catch (error) {
		log.error({ err: error }, 'Failed to initialize OIDC config');
		return null;
	}
}

export async function generateAuthUrl(state: string, nonce: string, codeVerifier: string) {
	const oidcConfig = await getOidcConfig();
	if (!oidcConfig) {
		throw new Error('OIDC not configured');
	}

	const redirectUri =
		process.env.OIDC_REDIRECT_URI ||
		`${process.env.ORIGIN || 'http://localhost:5173'}/auth/oidc/callback`;

	const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

	const parameters: Record<string, string> = {
		redirect_uri: redirectUri,
		scope: 'openid email profile',
		code_challenge: codeChallenge,
		code_challenge_method: 'S256',
		state,
		nonce
	};

	const authUrl = oidc.buildAuthorizationUrl(oidcConfig, parameters);
	return authUrl;
}

export async function handleOidcCallback(
	currentUrl: URL,
	codeVerifier: string,
	expectedState: string,
	expectedNonce: string
) {
	const oidcConfig = await getOidcConfig();
	if (!oidcConfig) {
		throw new Error('OIDC not configured');
	}

	const result = await oidc.authorizationCodeGrant(oidcConfig, currentUrl, {
		pkceCodeVerifier: codeVerifier,
		expectedState,
		expectedNonce
	});

	const claims = result.claims();
	if (!claims) {
		throw new Error('ID Token not provided by OIDC provider');
	}

	const email = claims.email as string | undefined;
	const sub = claims.sub as string;

	if (!email) {
		throw new Error('Email not provided by OIDC provider');
	}

	// Find or create user
	let user = await prisma.user.findFirst({
		where: {
			OR: [{ email }, { oidcSub: sub, oidcProvider: process.env.OIDC_PROVIDER_NAME || 'oidc' }]
		}
	});

	if (!user) {
		// Check if registration is allowed (only if no users exist)
		const userCount = await prisma.user.count();
		if (userCount > 0) {
			throw new Error('Registration is disabled');
		}

		// Create new user
		user = await prisma.user.create({
			data: {
				email,
				oidcProvider: process.env.OIDC_PROVIDER_NAME || 'oidc',
				oidcSub: sub,
				passwordHash: null
			}
		});
	} else {
		// Update existing user with OIDC info if not set
		if (!user.oidcSub || !user.oidcProvider) {
			user = await prisma.user.update({
				where: { id: user.id },
				data: {
					oidcProvider: process.env.OIDC_PROVIDER_NAME || 'oidc',
					oidcSub: sub
				}
			});
		}
	}

	// Create session
	const session = await createSession(user.id);
	return { session, user };
}

export const generators = {
	state: oidc.randomState,
	nonce: oidc.randomNonce,
	codeVerifier: oidc.randomPKCECodeVerifier
};
