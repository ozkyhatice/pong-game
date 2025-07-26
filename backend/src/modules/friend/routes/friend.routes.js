import { verifyJWT } from '../../middleware/auth.middleware.js';
import { CreateFriendRequestSchema, GetIncomingRequestsSchema } from '../schema.js';
import { CreateFriendRequestController , getIncomingFriendRequestsController} from '../controller/friend.controller.js';
export default async function friendRoute(app, options) {
    app.post('/add/:targetId', {
        schema: CreateFriendRequestSchema,
        preHandler: [verifyJWT]
    }, CreateFriendRequestController)
    app.get('/requests/incoming', {
        schema: GetIncomingRequestsSchema,
        preHandler: [verifyJWT]
    }, getIncomingFriendRequestsController);

}