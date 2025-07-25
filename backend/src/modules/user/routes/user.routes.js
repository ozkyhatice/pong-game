import { verifyToken } from "../../../middleware/auth.js";
import { getMyProfile } from '../controller/user.controller.js';
import { getMyProfileSchema } from '../schema.js';

export default async function userRoutes(app, options) {

	app.get('/me', {
		preHandler: verifyToken,
		schema: getMyProfileSchema
	}, getMyProfile);

}