import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import type { UserRow } from '../types/user';

const JWT_TOKEN_SECRET = process.env.JWT_TOKEN_SECRET as string;

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_TOKEN_SECRET) as JwtPayload;

    const [rows] = await db.execute<UserRow[]>(
      'SELECT * FROM users WHERE id = ? AND access_token = ?',
      [decoded.id, token],
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Token expired or invalid' });
    }

    req.user = decoded;
    next();
  } catch (err: unknown) {
    return res
      .status(401)
      .json({ message: 'Invalid or expired token', error: err });
  }
}
