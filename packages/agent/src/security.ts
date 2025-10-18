import { createSecretKey } from 'node:crypto';
import { jwtVerify, JWTPayload } from 'jose';
import type { VerifiedToken } from './types.js';

const DEFAULT_TTL_SECONDS = 120;

interface VerifyOptions {
  secret: string;
  ttlSeconds?: number;
}

export async function verifyToken(token: string, options: VerifyOptions): Promise<VerifiedToken> {
  const { secret, ttlSeconds = DEFAULT_TTL_SECONDS } = options;
  if (!secret) {
    throw new Error('AGENT_JWS_SECRET is required');
  }

  const key = createSecretKey(Buffer.from(secret, 'utf-8'));
  let payload: JWTPayload;

  try {
    const result = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      maxTokenAge: `${ttlSeconds}s`,
    });
    payload = result.payload;
  } catch (error) {
    throw Object.assign(new Error('Invalid token'), { status: 401, code: 'INVALID_TOKEN', cause: error });
  }

  if (!payload.jti || typeof payload.jti !== 'string') {
    throw Object.assign(new Error('Missing token id'), { status: 401, code: 'INVALID_TOKEN' });
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw Object.assign(new Error('Missing user id'), { status: 401, code: 'INVALID_TOKEN' });
  }

  if (!payload.domain || typeof payload.domain !== 'string') {
    throw Object.assign(new Error('Missing domain'), { status: 401, code: 'INVALID_TOKEN' });
  }

  if (!payload.exp || typeof payload.exp !== 'number') {
    throw Object.assign(new Error('Missing expiry'), { status: 401, code: 'INVALID_TOKEN' });
  }

  return {
    jti: payload.jti,
    userId: payload.sub,
    domain: payload.domain,
    exp: payload.exp,
  };
}
