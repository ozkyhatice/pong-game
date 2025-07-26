import userService from '../../user/service/user.service.js';
import { isExistingFriendRequestService, getIncomingFriendRequestsService, postAcceptRequestService, isFriend, getIncomingFriendRequestsServiceById} from '../service/friend.service.js';
export async function CreateFriendRequestController(request, reply) {
    const requesterId = request.user.id;
    const targetId = request.params.targetId;

    if (!targetId || isNaN(targetId)) {
        return reply.code(400).send({ error: 'Invalid target user ID' });
    }
    const user = await userService.findUserById(targetId);
    if (!user) {
        return reply.code(404).send({ error: 'Target user not found' });
    }
    if (requesterId == targetId) {
        return reply.code(400).send({ error: 'You cannot send a friend request to yourself' });
    }
    const existingUser = await userService.findUserById(targetId);
    if (!existingUser) {
        return reply.code(404).send({ error: 'Target user not found' });
    }
    const existingRequest = await isExistingFriendRequestService(requesterId, targetId);
    if (existingRequest) {
        return reply.code(400).send({ error: 'Friend request already exists' });
    }
    try {
        const result = await addFriendRequestService(requesterId, targetId);
        if (result.changes > 0) {
            return reply.code(201).send({ message: 'Friend request sent successfully' });
        } else {
            return reply.code(500).send({ error: 'Failed to send friend request' });
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        return reply.code(500).send({ error: 'Internal server error' });
    }
}

export async function getIncomingFriendRequestsController(request, reply) {
    const userId = request.user.id;
    const requests = await getIncomingFriendRequestsService(userId);
    if (requests.length === 0) {
        return reply.code(404).send({ message: 'No incoming friend requests' });
    }
    return reply.code(200).send({ requests });
}

export async function postAcceptRequestController(request, reply) {
    const userId = request.user.id;
    const targetId = request.params.targetId;

    const alreadyFriend = await isFriend(targetId, userId);
    console.log(alreadyFriend);
    if (alreadyFriend.length > 0)
        return reply.code(409).send({ message: "You are already friends" });
    const pendingRequest = await getIncomingFriendRequestsServiceById(targetId, userId);
    if (!pendingRequest || pendingRequest.length === 0)
        return reply.code(404).send({ message: "No pending request found" });
    const accept = await postAcceptRequestService(userId, targetId);
    if (accept.changes > 0)
        return reply.code(201).send({message : "Accepted request"});
    else
        return reply.code(500).send({message : "Failed to accept request"});

}