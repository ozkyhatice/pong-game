import { verifyToken } from "../../../middleware/auth.js";
import { 
  getMyProfile, 
  getUserById,
  getUserByUsername,
  updateMyProfile,
  updateMyAvatar,
  deleteMyAvatar,
  getUserTournamentStatus
} from '../controller/user.controller.js';
import { 
  getMyProfileSchema, 
  getUserByIdSchema,
  getUserByUsernameSchema,
  updateProfileSchema,
  updateMyAvatarSchema,
  deleteMyAvatarSchema
} from '../schema.js';

export default async function userRoutes(app, options) {
  // Get current user profile
  app.get('/me', {
    preHandler: verifyToken,
    schema: getMyProfileSchema
  }, getMyProfile);

  // Update current user profile
  app.put('/me', {
    preHandler: verifyToken,
    schema: updateProfileSchema
  }, updateMyProfile);

  // avatar upload
  app.put('/me/avatar', {
    preHandler: verifyToken,
    schema: updateMyAvatarSchema
  }, updateMyAvatar);

  // avatar delete
  app.delete('/me/avatar', {
    preHandler: verifyToken,
    schema: deleteMyAvatarSchema
  }, deleteMyAvatar);

  // Get user by id
  app.get('/id/:id', {
    preHandler: verifyToken,
    schema: getUserByIdSchema
  }, getUserById);

  // Get user tournament status
  app.get('/tournament-status/:id', {
    preHandler: verifyToken
  }, getUserTournamentStatus);
  
  // Get user by username (should be last to avoid conflicts)
  app.get('/:username', {
    preHandler: verifyToken,
    schema: getUserByUsernameSchema
  }, getUserByUsername);
}