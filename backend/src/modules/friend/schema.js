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
export { CreateFriendRequestSchema, GetIncomingRequestsSchema };