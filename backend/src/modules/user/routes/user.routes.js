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
  
  app.get('/me', {
    preHandler: verifyToken,
    schema: getMyProfileSchema
  }, getMyProfile);

  
  app.put('/me', {
    preHandler: verifyToken,
    schema: updateProfileSchema
  }, updateMyProfile);

  
  app.put('/me/avatar', {
    preHandler: verifyToken,
    schema: updateMyAvatarSchema
  }, updateMyAvatar);

  
  app.delete('/me/avatar', {
    preHandler: verifyToken,
    schema: deleteMyAvatarSchema
  }, deleteMyAvatar);

  
  app.get('/id/:id', {
    preHandler: verifyToken,
    schema: getUserByIdSchema
  }, getUserById);

  
  app.get('/tournament-status/:id', {
    preHandler: verifyToken
  }, getUserTournamentStatus);
  
  
  app.get('/:username', {
    preHandler: verifyToken,
    schema: getUserByUsernameSchema
  }, getUserByUsername);
}