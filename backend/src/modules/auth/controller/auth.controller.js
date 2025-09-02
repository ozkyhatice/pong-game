import { registerUser, loginUser, handleGoogleUser } from '../service/auth.service.js';
import { escapeFields } from '../../../utils/security.js';
import { 
  isValidEmail, 
  isValidUsername, 
  validatePassword, 
  containsSqlInjection,
  sanitizeGeneralInput 
} from '../../../utils/validation.js';

export async function register(request, reply) {
  const { username, email, password } = request.body;
  
  // Temel validation kontrolü
  if (!username || !email || !password) {
    return reply.code(400).send({
      success: false,
      message: 'Username, email and password are required'
    });
  }

  // Email validation
  if (!isValidEmail(email)) {
    return reply.code(400).send({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  // Username validation
  if (!isValidUsername(username)) {
    return reply.code(400).send({
      success: false,
      message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores'
    });
  }

  // will be activated later for stronger
  // Password validation
  // const passwordValidation = validatePassword(password);
  // if (!passwordValidation.isValid) {
  //   return reply.code(400).send({
  //     success: false,
  //     message: passwordValidation.message
  //   });
  // }

  // SQL injection kontrolü
  if (containsSqlInjection(username) || containsSqlInjection(email)) {
    return reply.code(400).send({
      success: false,
      message: 'Invalid characters detected in input'
    });
  }

  // XSS koruması için input'ları sanitize et
  const sanitizedUsername = sanitizeGeneralInput(username, { maxLength: 20 });
  const sanitizedEmail = sanitizeGeneralInput(email, { maxLength: 255 });

  try {
    const user = await registerUser({ 
      username: sanitizedUsername, 
      email: sanitizedEmail, 
      password 
    });

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

export async function login(request, reply) {
  const { email, password } = request.body;
  
  // Temel validation kontrolü
  if (!email || !password) {
    return reply.code(400).send({
      success: false,
      message: 'Email and password are required'
    });
  }

  // Email validation
  if (!isValidEmail(email)) {
    return reply.code(400).send({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  // SQL injection kontrolü
  if (containsSqlInjection(email)) {
    return reply.code(400).send({
      success: false,
      message: 'Invalid characters detected in email'
    });
  }

  // XSS koruması için email'i sanitize et
  const sanitizedEmail = sanitizeGeneralInput(email, { maxLength: 255 });

  try {
    const user = await loginUser({ email: sanitizedEmail, password });
    console.log('2FA is enabled for user:', user.isTwoFAEnabled);

    // Eğer kullanıcı 2FA etkinleştirmişse, 2FA doğrulaması yapılacak
    if (user.isTwoFAEnabled) {
      console.log('2FA is enabled for user:', user.id);
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

export async function googleCallbackHandler(request, reply) {
  try {
    // Google'dan access token al
    const { token } = await request.server.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

    // Google API'den kullanıcı bilgilerini al
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${token.access_token}`
      }
    });

    const googleUser = await userInfoResponse.json();

    // Kullanıcıyı veritabanında kaydet/güncelle
    const user = await handleGoogleUser({
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture
    });

    if (user.isTwoFAEnabled) {
      console.log('2FA is enabled for Google user:', user.id);
      return reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}?oauth=2fa_required&userId=${user.id}`);
    }

    // JWT token oluştur
    const jwtToken = await reply.jwtSign({
      id: user.id,
      email: user.email,
      username: user.username
    });

    // Frontend'e başarılı redirect
    reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}?token=${jwtToken}&oauth=success`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}?error=oauth_failed`);
  }
}

export async function me(request, reply) {
  reply.send({ 
    success: true,
    user: request.user 
  });
}
