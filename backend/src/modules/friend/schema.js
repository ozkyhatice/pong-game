const CreateFriendRequestSchema = {
    summary : 'Send request',
    tags: ['Friend'],
    type: 'object',
    properties: {
        targetId: {
            type: 'integer', 
            description: "Recever's user ID",
        }
    },
    required: ['targetId'],
}

const GetIncomingRequestsSchema = {
    summary: 'Get incoming friend requests',
    tags: ['Friend'],
}

const PostAcceptRequestSchema = {
    summary : 'Accept request',
    tags: ['Friend'],
    type: 'object',
    properties: {
        targetId: {
            type: 'integer',
            description: "Recever's user ID"
        }
    },
    required: ['targetId']
}
const GetFriendsListSchema = {
    summary : 'List of Friends',
    tags:  ['Friend'],
}
const GetSentRequestSchema = {
    summary : 'list of requests sent',
    tags: ['Friend'],
}

const DeleteFriendSchema = {
    summary : 'delete friend',
    tags: ['Friend'],
    type: 'object',
    properties: {
        targetId: {
            type: 'integer',
        }
    },
    required: ['targetId']
}
const BlockFriendSchema = {
    summary: 'Block a friend',
    tags: ['Friend'],
    type: 'object',
    properties: {
        targetId: {
            type: 'integer',
            description: "ID of the user to block"
        }
    },
    required: ['targetId']
}
const UnBlockFriendSchema = {
    summary: 'Unblock a friend',
    tags: ['Friend'],
    type: 'object',
    properties: {
        targetId: {
            type: 'integer',
            description: "ID of the user to block"
        }
    },
    required: ['targetId']
}

export { 
    CreateFriendRequestSchema, 
    GetIncomingRequestsSchema,
    PostAcceptRequestSchema,
    GetFriendsListSchema,
    GetSentRequestSchema,
    DeleteFriendSchema,
    BlockFriendSchema,
    UnBlockFriendSchema

};