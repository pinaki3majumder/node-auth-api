import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const JWT_TOKEN_SECRET = process.env.JWT_TOKEN_SECRET as string;

export interface AuthRequest extends Request {
  user?: any;
}

export  async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded: any = jwt.verify(token, JWT_TOKEN_SECRET); 
    
    const [rows]: any = await db.execute(
      'SELECT * FROM users WHERE id = ? AND access_token = ?',
      [decoded.id, token]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Token expired or invalid' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
