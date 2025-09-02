import {
  generate2FASecret,
  disable2FA,
  verify2FACode,
} from "../service/2fa.service.js";
import { initDB } from "../../../config/db.js";
import { sanitizeInput } from "../../../utils/security.js";
import { containsSqlInjection, sanitizeGeneralInput } from '../../../utils/validation.js';

/**
 * Controller for 2FA setup process
 * Generates a QR code and secret for the user to setup their authenticator app
 * @param {Object} request - Fastify request object containing user session data
 * @param {Object} reply - Fastify reply object
 */
export async function handle2FASetup(request, reply) {
  try {
    const userId = request.user.id;
    const { qr, secret } = await generate2FASecret(userId);
    reply.send({ qr, secret });
  } catch (error) {
    reply.status(400).send({ error: error.message });
  }
}

/**
 * Controller to disable 2FA for a user
 * Removes 2FA settings from user's account
 * @param {Object} request - Fastify request object containing user session data
 * @param {Object} reply - Fastify reply object
 */
export async function handle2FADisable(request, reply) {
  try {
    const userId = request.user.id;
    const result = await disable2FA(userId);
    reply.send(result);
  } catch (error) {
    reply.status(400).send({ error: error.message });
  }
}

/**
 * Controller to verify 2FA token during setup process
 * Validates the token provided by the user's authenticator app
 * Includes input validation and sanitization for security
 * @param {Object} request - Fastify request object with user session and token data
 * @param {Object} reply - Fastify reply object
 */
export async function handle2FAVerify(request, reply) {
  try {
    const userId = request.user.id;
    const { token } = request.body;

    // Input validation - check if token exists and is a string
    if (!token || typeof token !== 'string') {
      return reply.status(400).send({ error: "2FA token is required" });
    }

    // Format validation - TOTP tokens are typically 6-digit numbers
    if (!/^\d{6}$/.test(token)) {
      return reply.status(400).send({ error: "2FA token must be 6 digits" });
    }

    // Security check for SQL injection attempts
    if (containsSqlInjection(token)) {
      return reply.status(400).send({ error: "Invalid characters detected in token" });
    }

    // Apply input sanitization to prevent XSS attacks
    const sanitizedToken = sanitizeGeneralInput(token, { maxLength: 6 });

    const isValid = await verify2FACode(userId, sanitizedToken);
    if (!isValid) {
      return reply.status(400).send({ error: "Invalid 2FA token." });
    }
    return reply.send({
      success: true,
      message: "2FA token verified successfully.",
    });
  } catch (error) {
    return reply.status(400).send({ error: error.message });
  }
}

/**
 * Controller to handle 2FA verification during login
 * Verifies the 2FA token and returns a JWT if valid
 * Implements security measures against common web vulnerabilities
 * 
 * @param {Object} request - Fastify request object containing userId and token
 * @param {Object} reply - Fastify reply object
 * @returns {Object} Response containing JWT token and user data if successful
 */
export async function handle2FALoginVerify(request, reply) {
  try {
    const { userId, token } = request.body;

    // Apply input sanitization to prevent XSS attacks
    const sanitizedToken = sanitizeInput(token);

    const isValid = await verify2FACode(userId, sanitizedToken);
    if (!isValid) {
      return reply.status(400).send({ error: "Invalid 2FA token." });
    }

    // Retrieve user information using parameterized query to prevent SQL injection
    const db = await initDB();
    const user = await db.get('SELECT id, email, username FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return reply.status(404).send({ error: "User not found." });
    }

    // Generate JWT with appropriate claims and expiration
    const jwtToken = await reply.jwtSign({
      id: user.id,
      email: user.email,
      username: user.username
    }, { expiresIn: '7d' });

    return reply.send({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      message: "2FA verified and login successful."
    });
  } catch (error) {
    return reply.status(400).send({ error: error.message });
  }
}
