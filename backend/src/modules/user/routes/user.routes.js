import { verifyToken } from "../../../middleware/auth.js";
import { getMyProfile, getIdController } from '../controller/user.controller.js';
import { getMyProfileSchema, getUserRoutesSchema } from '../schema.js';

export default async function userRoutes(app, options) {

	app.get('/me', {
		preHandler: verifyToken,
		schema: getMyProfileSchema
	}, getMyProfile);
	app.get('/:username', {
		preHandler: verifyToken,
		schema: getUserRoutesSchema
	}, getIdController);
}