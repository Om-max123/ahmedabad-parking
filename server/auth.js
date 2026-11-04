import crypto from 'crypto';
import dotenv from 'dotenv';
import { query } from './db.js';

dotenv.config();

// Secure session / JWT-like secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'ahmedabad-smart-parking-secure-secret-2026';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Base64URL encode string or buffer
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString();
}

/**
 * Create a cryptographically signed HMAC-SHA256 token
 */
export function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_MS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 token
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return null;
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Express middleware: Require authenticated user via Bearer token
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Please log in with your driver profile.',
      code: 'UNAUTHENTICATED'
    });
  }

  const token = authHeader.slice(7).trim();
  const decoded = verifyToken(token);
  const uid = decoded ? (decoded.userId || decoded.id) : null;
  if (!decoded || !uid) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please log in again.',
      code: 'INVALID_TOKEN'
    });
  }

  try {
    // Fetch live user from database to ensure user still exists and get latest wallet balance
    const userRes = await query('SELECT * FROM users WHERE id = $1', [uid]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({
        error: 'User profile not found. Please log in again.',
        code: 'USER_NOT_FOUND'
      });
    }

    const dbUser = userRes.rows[0];
    req.user = {
      id: dbUser.id,
      name: dbUser.name,
      phone: dbUser.phone,
      email: dbUser.email,
      carNumber: dbUser.car_number,
      vehicleType: dbUser.vehicle_type,
      walletBalance: parseFloat(dbUser.wallet_balance || 0),
      role: dbUser.role || 'driver',
      avatarUrl: dbUser.avatar_url,
      createdAt: dbUser.created_at,
      lastLogin: dbUser.last_login
    };
    next();
  } catch (err) {
    console.error('[Auth Middleware] DB lookup error:', err.message);
    return res.status(500).json({ error: 'Authentication verification failed' });
  }
}

/**
 * Express middleware: Optional authentication (attaches req.user if token is present)
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7).trim();
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    req.user = null;
    return next();
  }

  try {
    const userRes = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (userRes.rows.length > 0) {
      const dbUser = userRes.rows[0];
      req.user = {
        id: dbUser.id,
        name: dbUser.name,
        phone: dbUser.phone,
        email: dbUser.email,
        carNumber: dbUser.car_number,
        vehicleType: dbUser.vehicle_type,
        walletBalance: parseFloat(dbUser.wallet_balance || 0),
        role: dbUser.role || 'driver',
        avatarUrl: dbUser.avatar_url,
      };
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
}

/**
 * Express middleware: Require Administrative Role
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Administrative privileges required. This endpoint is restricted to authorized municipal operators.',
      code: 'FORBIDDEN_NOT_ADMIN'
    });
  }
  next();
}

/**
 * Verifies a Google ID Token (JWT) using Google OAuth2 TokenInfo endpoint
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google ID token is required.');
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google token verification failed: ${errorBody || response.statusText}`);
  }

  const payload = await response.json();
  const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (expectedClientId && payload.aud && payload.aud !== expectedClientId) {
    console.warn('[Google OAuth] Warning: Token audience does not match configured GOOGLE_CLIENT_ID');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
    name: payload.name || payload.email?.split('@')[0] || 'Google Driver',
    picture: payload.picture,
  };
}

