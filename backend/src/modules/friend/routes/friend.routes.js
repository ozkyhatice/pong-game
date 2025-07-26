import { verifyJWT } from '../../middleware/auth.middleware.js';
import { CreateFriendRequestSchema, GetIncomingRequestsSchema, PostAcceptRequestSchema, GetFriendsListSchema } from '../schema.js';
import { CreateFriendRequestController , getIncomingFriendRequestsController, postAcceptRequestController, getFriendsListController} from '../controller/friend.controller.js';
export default async function friendRoute(app, options) {
    app.post('/add/:targetId', {
        schema: CreateFriendRequestSchema,
        preHandler: [verifyJWT]
    }, CreateFriendRequestController)
    app.get('/requests/incoming', {
        schema: GetIncomingRequestsSchema,
        preHandler: [verifyJWT]
    }, getIncomingFriendRequestsController);
    app.post('/:targetId/accept', {
        schema: PostAcceptRequestSchema,
        preHandler: [verifyJWT]
    }, postAcceptRequestController)
    app.get('/', {
        schema: GetFriendsListSchema,
        preHandler: [verifyJWT],
    }, getFriendsListController);

}