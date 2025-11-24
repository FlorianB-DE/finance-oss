import type { PageServerLoad } from './$types';
import { getLoginAttempts } from '$lib/server/login-attempts';

export const load: PageServerLoad = async () => {
	const attempts = await getLoginAttempts(200);

	return {
		attempts: attempts.map(attempt => ({
			id: attempt.id,
			email: attempt.email,
			success: attempt.success,
			createdAt: attempt.createdAt.toISOString(),
			ipAddress: attempt.ipAddress,
			userAgent: attempt.userAgent,
			user: attempt.user
				? {
						id: attempt.user.id,
						email: attempt.user.email
					}
				: null
		}))
	};
};
