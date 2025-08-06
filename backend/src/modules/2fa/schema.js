export const setup2FASchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        qr: { type: 'string' },
        secret: { type: 'string' }
      },
      required: ['qr', 'secret']
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

export const disable2FASchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      },
      required: ['success', 'message']
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

export const verify2FASchema = {
  body: {
    type: 'object',
    required: ['token'],
    properties: {
      token: { type: 'string', minLength: 6, maxLength: 6 }
    }
  }
};

export const verify2FALoginSchema = {
  body: {
    type: 'object',
    required: ['userId', 'token'],
    properties: {
      userId: { type: 'integer' },
      token: { type: 'string', minLength: 6, maxLength: 6 }
    }
  }
};