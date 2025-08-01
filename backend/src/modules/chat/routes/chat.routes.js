import {
  getChatHistoryController,
  markMessagesAsReadController,
  getUnreadCountController,
  getChatStatisticsController
} from '../controller/chat.controller.js';
import {
  getChatHistorySchema,
  markMessagesAsReadSchema,
  getUnreadCountSchema,
  getChatStatisticsSchema
} from '../schema.js';
import { verifyToken } from '../../../middleware/auth.js';

async function chatRoutes(fastify) {
  // GET /chat/history/:userId - Get chat history with a specific user
  fastify.get('/history/:userId', {
    schema: getChatHistorySchema,
    preHandler: verifyToken,
    handler: getChatHistoryController
  });

  // PUT /chat/mark-read/:userId - Mark messages from a specific user as read
  fastify.put('/mark-read/:userId', {
    schema: markMessagesAsReadSchema,
    preHandler: verifyToken,
    handler: markMessagesAsReadController
  });

  // GET /chat/unread-count - Get total unread message count
  fastify.get('/unread-count', {
    schema: getUnreadCountSchema,
    preHandler: verifyToken,
    handler: getUnreadCountController
  });

  // GET /chat/statistics - Get chat statistics
  fastify.get('/statistics', {
    schema: getChatStatisticsSchema,
    preHandler: verifyToken,
    handler: getChatStatisticsController
  });
}

export default chatRoutes;
