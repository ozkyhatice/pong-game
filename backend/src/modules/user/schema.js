const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    username: { type: 'string' },
    email: { type: 'string', format: 'email' },
    avatar: { type: ['string', 'null'] },
    wins: { type: 'integer' },
    losses: { type: 'integer' }
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

export const getUserByUsernameSchema = {
  params: {
    type: 'object',
    properties: {
      username: { type: 'string', minLength: 1 }
    },
    required: ['username']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        user: userResponseSchema
      }
    }
  }
};

export const updateProfileSchema = {
  body: {
    type: 'object',
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 50 },
      email: { type: 'string', format: 'email' },
      avatar: { type: ['string', 'null'] }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        user: userResponseSchema
      }
    }
  }
};

export const updateStatsSchema = {
  body: {
    type: 'object',
    properties: {
      wins: { type: 'integer', minimum: 0 },
      losses: { type: 'integer', minimum: 0 }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        user: userResponseSchema
      }
    }
  }
};

export const searchUsersSchema = {
  querystring: {
    type: 'object',
    properties: {
      q: { type: 'string', minLength: 2 },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
    },
    required: ['q']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: userResponseSchema
        }
      }
    }
  }
};