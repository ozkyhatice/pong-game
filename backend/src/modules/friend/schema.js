export const createFriendRequestSchema = {
  summary: 'Send friend request',
  tags: ['Friend'],
  params: {
    type: 'object',
    properties: {
      targetId: {
        type: 'integer',
        description: "ID of the user to send friend request to",
        minimum: 1 // Ensure positive integers only
      }
    },
    required: ['targetId']
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    500: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

export const acceptRequestSchema = {
  summary: 'Accept friend request',
  tags: ['Friend'],
  params: {
    type: 'object',
    properties: {
      targetId: {
        type: 'integer',
        description: "Sender's user ID",
        minimum: 1 // Ensure positive integers only
      }
    },
    required: ['targetId']
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    },
    409: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    },
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};

export const rejectRequestSchema = {
  summary: 'Reject friend request',
  tags: ['Friend'],
  params: {
    type: 'object',
    properties: {
      targetId: {
        type: 'integer',
        description: "Sender's user ID",
        minimum: 1 // Ensure positive integers only
      }
    },
    required: ['targetId']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    },
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};

export const getFriendsListSchema = {
  summary: 'Get friends list',
  tags: ['Friend'],
  response: {
    200: {
      type: 'object',
      properties: {
        friends: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              requesterID: { type: 'integer' },
              recipientID: { type: 'integer' },
              status: { type: 'string' },
              friendInfo: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  username: { type: 'string' },
                  avatar: { type: ['string', 'null'] },
                  wins: { type: 'integer' },
                  losses: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const getIncomingRequestsSchema = {
  summary: 'Get incoming friend requests',
  tags: ['Friend'],
  response: {
    200: {
      type: 'object',
      properties: {
        requests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              requesterID: { type: 'integer' },
              recipientID: { type: 'integer' },
              status: { type: 'string' },
              senderInfo: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  username: { type: 'string' },
                  avatar: { type: ['string', 'null'] },
                  wins: { type: 'integer' },
                  losses: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const getSentRequestsSchema = {
  summary: 'Get sent friend requests',
  tags: ['Friend'],
  response: {
    200: {
      type: 'object',
      properties: {
        requests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              requesterID: { type: 'integer' },
              recipientID: { type: 'integer' },
              status: { type: 'string' },
              targetInfo: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  username: { type: 'string' },
                  avatar: { type: ['string', 'null'] },
                  wins: { type: 'integer' },
                  losses: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const deleteFriendSchema = {
  summary: 'Remove friend',
  tags: ['Friend'],
  params: {
    type: 'object',
    properties: {
      targetId: {
        type: 'integer',
        description: "ID of the friend to remove",
        minimum: 1 // Ensure positive integers only
      }
    },
    required: ['targetId']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    500: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

export const blockFriendSchema = {
  summary: 'Block a user',
  tags: ['Friend'],
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: "ID of the user to block",
        minimum: 1 // Ensure positive integers only
      }
    },
    required: ['id']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    500: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

export const unblockFriendSchema = {
  summary: 'Unblock a user',
  tags: ['Friend'],
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: "ID of the user to unblock",
        minimum: 1 // Ensure positive integers only
      }
    },
    required: ['id']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    500: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

export const getBlockedUsersSchema = {
  summary: 'Get blocked users list',
  tags: ['Friend'],
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: "ID of the user whose blocked list is to be fetched",
        minimum: 1 // Ensure positive integers only
      }
    },
    required: ['id']  
  },
  response: {
    200: {
      type: 'object',
      properties: {
        blockedUsers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              username: { type: 'string' },
              avatar: { type: ['string', 'null'] },
              wins: { type: 'integer' },
              losses: { type: 'integer' }
            }
          }
        }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    500: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};
