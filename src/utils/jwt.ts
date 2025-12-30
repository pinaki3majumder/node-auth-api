import jwt from 'jsonwebtoken';
import type { Secret } from 'jsonwebtoken';
import type { StringValue } from 'ms';

const JWT_TOKEN_SECRET: Secret = process.env.JWT_TOKEN_SECRET!;
const JWT_REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET!;
const TOKEN_EXPIRES_IN = process.env.JWT_TOKEN_EXPIRES_IN as StringValue;
const JWT_REFRESH_EXPIRES_IN = process.env
  .JWT_REFRESH_EXPIRES_IN as StringValue;

export function generateAccessToken(payload: object): string {
  return jwt.sign(payload, JWT_TOKEN_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

export function generateRefreshToken(payload: object): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}
