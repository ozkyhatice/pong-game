import {
  getChatHistoryController,
  markMessagesAsReadController
} from '../controller/chat.controller.js';
import {
  getChatHistorySchema,
  markMessagesAsReadSchema
} from '../schema.js';
import { verifyToken } from '../../../middleware/auth.js';

async function chatRoutes(fastify) {
  
  fastify.get('/history/:userId', {
    schema: getChatHistorySchema,
    preHandler: verifyToken,
    handler: getChatHistoryController
  });

  
  fastify.put('/mark-read/:userId', {
    schema: markMessagesAsReadSchema,
    preHandler: verifyToken,
    handler: markMessagesAsReadController
  });
}

export default chatRoutes;
