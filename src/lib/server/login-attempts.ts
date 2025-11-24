import { prisma } from '$lib/server/prisma';

type RecordLoginAttemptParams = {
	email: string;
	success: boolean;
	userId?: number | null;
	ipAddress?: string | null;
	userAgent?: string | null;
};

export async function recordLoginAttempt({
	email,
	success,
	userId,
	ipAddress,
	userAgent
}: RecordLoginAttemptParams) {
	await prisma.loginAttempt.create({
		data: {
			email,
			success,
			userId: userId ?? undefined,
			ipAddress: ipAddress ?? undefined,
			userAgent: userAgent ?? undefined
		}
	});
}

export async function getLastSuccessfulLogin(userId: number) {
	return prisma.loginAttempt.findFirst({
		where: {
			userId,
			success: true
		},
		orderBy: {
			createdAt: 'desc'
		}
	});
}

export async function getLoginAttempts(limit = 100) {
	return prisma.loginAttempt.findMany({
		orderBy: { createdAt: 'desc' },
		take: limit,
		include: {
			user: {
				select: { id: true, email: true }
			}
		}
	});
}

