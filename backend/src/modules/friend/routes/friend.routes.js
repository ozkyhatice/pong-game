import { CreateFriendRequestSchema } from '../schema.js';
import { CreateFriendRequestController } from '../controller/friend.controller.js';
import { verifyJWT } from '../../middleware/auth.middleware.js';
export default async function friendRoute(app, options) {
    app.post('/add/:targetId', {
        schema: CreateFriendRequestSchema,
        preHandler: [verifyJWT]
    }, CreateFriendRequestController)
    
}