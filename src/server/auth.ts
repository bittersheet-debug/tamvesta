import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import type { User, UserRole } from '../types/index.ts';

const TOKEN_SECRET = process.env.TAMVESTA_TOKEN_SECRET || 'TAMVESTA-SESSION-KEY-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
  deviceId?: string;
}

export interface VerifiedSession {
  userId: string;
  tokenVersion: number;
}

// Signed token format: base64url(userId|timestamp|tokenVersion).hmacSha256Hex
export function createSessionToken(userId: string, tokenVersion: number = 0): string {
  const payload = `${userId}|${Date.now()}|${tokenVersion}`;
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('hex');
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): VerifiedSession | null {
  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    let userId = '';
    let timestamp = 0;
    let tokenVersion = 0;

    if (payload.includes('|')) {
      const parts = payload.split('|');
      userId = parts[0] || '';
      timestamp = parseInt(parts[1] || '0', 10);
      tokenVersion = parseInt(parts[2] || '0', 10) || 0;
    } else {
      const parts = payload.split(':');
      userId = parts[0] || '';
      timestamp = parseInt(parts[1] || '0', 10);
    }

    if (!userId || !Number.isFinite(timestamp)) return null;

    // 7-day token expiration
    if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }

    return { userId, tokenVersion };
  } catch {
    return null;
  }
}

function extractRequestToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const queryToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  if (queryToken) return queryToken;
  return null;
}

function extractDeviceId(req: Request): string | undefined {
  const hdr = req.headers['x-device-id'];
  if (typeof hdr === 'string' && hdr.trim()) return hdr.trim();
  const q = typeof req.query.deviceId === 'string' ? req.query.deviceId.trim() : '';
  return q || undefined;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractRequestToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Sesi tidak valid. Harap login kembali.', code: 'NO_TOKEN' });
  }

  const verified = verifySessionToken(token);
  if (!verified) {
    return res.status(401).json({ error: 'Token kadaluarsa atau tidak valid.', code: 'INVALID_TOKEN' });
  }

  if (db.isUserDeleted(verified.userId)) {
    return res.status(401).json({ error: 'Akun Anda telah dihapus dari sistem. Harap hubungi Administrator.', code: 'SESSION_REVOKED' });
  }

  const user = db.findUserById(verified.userId);
  if (!user) {
    return res.status(401).json({ error: 'Pengguna tidak ditemukan atau telah dihapus.', code: 'SESSION_REVOKED' });
  }

  if (!user.isActive || user.registrationStatus === 'rejected') {
    return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.', code: 'ACCOUNT_DISABLED' });
  }

  const liveVersion = user.tokenVersion ?? 0;
  if (liveVersion !== verified.tokenVersion) {
    return res.status(401).json({
      error: 'Sesi Anda telah dicabut karena perubahan keamanan/akun. Silakan login kembali.',
      code: 'SESSION_REVOKED',
    });
  }

  const sessionId = typeof req.headers['x-session-id'] === 'string' ? req.headers['x-session-id'].trim() : '';
  if (sessionId && db.isDeviceSessionDeleted(sessionId)) {
    return res.status(401).json({
      error: 'Sesi perangkat ini telah diakhiri oleh Admin. Silakan login ulang.',
      code: 'SESSION_REVOKED',
    });
  }

  req.user = user;
  req.deviceId = extractDeviceId(req);
  next();
}

export function optionalAuthMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractRequestToken(req);
  if (!token) {
    return next();
  }

  const verified = verifySessionToken(token);
  if (verified && !db.isUserDeleted(verified.userId)) {
    const user = db.findUserById(verified.userId);
    if (user && user.isActive && (user.tokenVersion ?? 0) === verified.tokenVersion) {
      const sessionId = typeof req.headers['x-session-id'] === 'string' ? req.headers['x-session-id'].trim() : '';
      if (!sessionId || !db.isDeviceSessionDeleted(sessionId)) {
        req.user = user;
        req.deviceId = extractDeviceId(req);
      }
    }
  }

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Akses ditolak. Harap login terlebih dahulu.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Akses ditolak. Fitur ini memerlukan hak akses [${allowedRoles.join(', ')}].`,
      });
    }

    next();
  };
}
