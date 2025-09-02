const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    username: { type: 'string' },
    email: { type: 'string', format: 'email' },
    avatar: { type: ['string', 'null'] },
    wins: { type: 'integer' },
    losses: { type: 'integer' },
    isTwoFAEnabled: { type: 'boolean' }
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
      email: { type: 'string', format: 'email' }
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

export const updateMyAvatarSchema = {
  consumes: ['multipart/form-data'],
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: userResponseSchema
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

export const getUserByIdSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'integer' }
    },
    required: ['id']
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

export const deleteMyAvatarSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: userResponseSchema
      }
    }
  }
};