const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    username: { type: 'string' },
    email: { type: 'string', format: 'email' }
  },
  required: ['id', 'username', 'email']
};

export const getMyProfileSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        user: userResponseSchema
      }
    }
  }
};