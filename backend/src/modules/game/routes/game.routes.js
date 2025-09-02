import { verifyToken } from "../../../middleware/auth.js";
import { getMatchHistory } from '../controller/game.controller.js';
import { getMatchHistorySchema } from '../schema.js';

export default async function gameRoutes(app, options) {
  // Get match history for a user
  app.get('/matches/history/:userId', {
    preHandler: verifyToken,
    schema: getMatchHistorySchema
  }, getMatchHistory);
}
