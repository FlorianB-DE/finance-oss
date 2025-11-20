import { prisma } from '$lib/server/prisma';
import { dev } from '$app/environment';
import { randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'finances_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 Tage

export async function hashPassword(password: string) {
	if (typeof Bun === 'undefined') {
		throw new Error('Bun runtime is required for password hashing.');
	}

	return Bun.password.hash(password, {
		algorithm: 'bcrypt',
		cost: 12
	});
}

export async function verifyPassword(password: string, hash: string) {
	if (typeof Bun === 'undefined') {
		throw new Error('Bun runtime is required for password verification.');
	}

	return Bun.password.verify(password, hash);
}

export async function getUserByEmail(email: string) {
	return prisma.user.findUnique({ where: { email } });
}

export async function createUser(email: string, password: string) {
	const passwordHash = await hashPassword(password);
	return prisma.user.create({
		data: { email, passwordHash }
	});
}

export async function getUserByOidc(provider: string, sub: string) {
	return prisma.user.findUnique({
		where: {
			oidcProvider_oidcSub: {
				oidcProvider: provider,
				oidcSub: sub
			}
		}
	});
}

export async function createSession(userId: number) {
	const token = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

	const session = await prisma.session.create({
		data: {
			id: token,
			userId,
			expiresAt
		}
	});

	return session;
}

export async function deleteSession(sessionId: string) {
	try {
		await prisma.session.delete({ where: { id: sessionId } });
	} catch {
		// ignore
	}
}

export async function getSessionUser(sessionId: string) {
	const session = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { user: true }
	});

	if (!session) return null;
	if (session.expiresAt.getTime() < Date.now()) {
		await deleteSession(session.id);
		return null;
	}

	return session.user;
}

export function getSessionCookieAttributes(expiresAt: Date) {
	return {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax' as const,
		expires: expiresAt
	};
}
