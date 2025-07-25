import { getUserById } from '../service/user.service.js';

export async function getMyProfile(request, reply) {
	const userId = request.user.id;

	try {
		const user = await getUserById(userId);
		if (!user) {
			return reply.code(404).send({ error: 'User Not Found'});
		}
		
		reply.send({ user });
	} catch (error) {
		reply.code(500).send({ error: 'Internal Server Error' })
	}
}