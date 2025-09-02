const matchSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    player1Id: { type: 'integer' },
    player2Id: { type: 'integer' },
    player1Score: { type: 'integer' },
    player2Score: { type: 'integer' },
    winnerId: { type: ['integer', 'null'] },
    startedAt: { type: 'string' },
    endedAt: { type: ['string', 'null'] },
    tournamentId: { type: ['integer', 'null'] },
    round: { type: ['integer', 'null'] }
  },
  required: ['id', 'player1Id', 'player2Id', 'player1Score', 'player2Score']
};

export const getMatchHistorySchema = {
  params: {
    type: 'object',
    properties: {
      userId: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['userId']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        matches: {
          type: 'array',
          items: matchSchema
        },
        totalMatches: { type: 'integer' }
      }
    }
  }
};
