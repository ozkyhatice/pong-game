import { registerUser, loginUser, handleGoogleUser } from '../service/auth.service.js';
import { 
  isValidEmail, 
  isValidUsername, 
  containsSqlInjection,
  sanitizeGeneralInput,
  validatePassword 
} from '../../../utils/validation.js';
import { metrics } from '../../../plugins/metrics.js';

// register new user
export async function register(request, reply) {
  const { username, email, password } = request.body;
  
  if (!username || !email || !password) {
    return reply.code(400).send({
      success: false,
      message: 'Username, email and password are required'
    });
  }

  if (!isValidEmail(email)) {
    return reply.code(400).send({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  if (!isValidUsername(username)) {
    return reply.code(400).send({
      success: false,
      message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores'
    });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return reply.code(400).send({
      success: false,
      message: passwordValidation.message
    });
  }

  
  if (containsSqlInjection(username) || containsSqlInjection(email)) {
    return reply.code(400).send({
      success: false,
      message: 'Invalid characters detected in input'
    });
  }

  
  const sanitizedUsername = sanitizeGeneralInput(username, { maxLength: 20 });
  const sanitizedEmail = sanitizeGeneralInput(email, { maxLength: 255 });

  try {
    const user = await registerUser({ 
      username: sanitizedUsername, 
      email: sanitizedEmail, 
      password 
    });

    metrics.userRegistrations.inc();

    const token = await reply.jwtSign({
      id: user.id,
      email: user.email,
      username: user.username
    }, { expiresIn: '7d' });

    reply.code(201).send({ 
      success: true,
      token, 
      user 
    });
  } catch (error) {
    reply.code(400).send({ 
      success: false,
      message: error.message 
    });
  }
}

// login user
export async function login(request, reply) {
  const { email, password } = request.body;
  
  if (!email || !password) {
    return reply.code(400).send({
      success: false,
      message: 'Email and password are required'
    });
  }

  if (!isValidEmail(email)) {
    return reply.code(400).send({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  if (containsSqlInjection(email)) {
    return reply.code(400).send({
      success: false,
      message: 'Invalid characters detected in email'
    });
  }

  const sanitizedEmail = sanitizeGeneralInput(email, { maxLength: 255 });

  try {
    const user = await loginUser({ email: sanitizedEmail, password });

    
    if (user.isTwoFAEnabled) {
      return reply.send({ 
        success: true,
        message: '2FA_REQUIRED', 
        userId: user.id 
      });
    }

    const token = await reply.jwtSign({
      id: user.id,
      email: user.email,
      username: user.username
    }, { expiresIn: '7d' });

    reply.send({ 
      success: true,
      token, 
      user 
    });
  } catch (error) {
    reply.code(401).send({ 
      success: false,
      message: error.message 
    });
  }
}

// handle google oauth callback
export async function googleCallbackHandler(request, reply) {
  try {
    
    const { token } = await request.server.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);


    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${token.access_token}`
      }
    });

    const googleUser = await userInfoResponse.json();

    
    const user = await handleGoogleUser({
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture
    });

    if (user.isTwoFAEnabled) {
      return reply.redirect(`${process.env.BASE_URL || 'http://localhost:8080'}?oauth=2fa_required&userId=${user.id}`);
    }

    
    const jwtToken = await reply.jwtSign({
      id: user.id,
      email: user.email,
      username: user.username
    });

    
    reply.redirect(`${process.env.BASE_URL || 'http://localhost:8080'}?oauth=success&token=${jwtToken}`);
  } catch (error) {
    reply.redirect(`${process.env.BASE_URL || 'http://localhost:8080'}?oauth=error`);
  }
}


// get current user info
export async function me(request, reply) {
  reply.send({ 
    success: true,
    user: request.user 
  });
}
