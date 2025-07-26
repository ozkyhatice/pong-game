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
export { CreateFriendRequestSchema };