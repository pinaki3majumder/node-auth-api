import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import type { RefreshTokenPayload } from '../types/jwt';
import type { UserRow } from '../types/user';

interface MySqlError {
  code?: string;
}

const router = Router();

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { name, email, mobile, password } = req.body;

  if (!name || !email || !mobile || !password) {
    res.status(400).json({ message: 'All fields are required' });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      `INSERT INTO users (name, email, mobile, password)
       VALUES (?, ?, ?, ?)`,
      [name, email, mobile, hashedPassword],
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error: unknown) {
    const dbError = error as MySqlError;

    if (dbError.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'Email or Mobile already exists' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password required' });
    return;
  }

  try {
    const [rows] = await db.execute<UserRow[]>(
      'SELECT * FROM users WHERE email = ?',
      [email],
    );

    if (rows.length === 0) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // 🔐 Generate JWT
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
    });

    // Store both tokens in DB
    await db.execute(
      'UPDATE users SET refresh_token = ?, access_token = ? WHERE id = ?',
      [refreshToken, accessToken, user.id],
    );

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
    });
  } catch (error: unknown) {
    res.status(500).json({ message: 'Server error', error: error });
  }
});

router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({
    message: 'Protected data',
    user: req.user,
  });
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(401).json({ message: 'Refresh token required' });
    return;
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!,
    ) as JwtPayload & RefreshTokenPayload;

    const [rows] = await db.execute<UserRow[]>(
      'SELECT * FROM users WHERE id = ? AND refresh_token = ?',
      [decoded.id, refreshToken],
    );

    if (rows.length === 0) {
      res.status(403).json({ message: 'Invalid refresh token' });
      return;
    }

    const newAccessToken = generateAccessToken({
      id: decoded.id,
      email: rows[0].email,
    });

    // Replace old access token in DB
    await db.execute('UPDATE users SET access_token = ? WHERE id = ?', [
      newAccessToken,
      decoded.id,
    ]);

    res.json({ accessToken: newAccessToken });
  } catch (err: unknown) {
    res
      .status(403)
      .json({ message: 'Invalid or expired refresh token', error: err });
  }
});

router.post(
  '/logout',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    await db.execute('UPDATE users SET refresh_token = NULL WHERE id = ?', [
      (req.user as JwtPayload).id,
    ]);

    res.json({ message: 'Logged out successfully' });
  },
);

export default router;
