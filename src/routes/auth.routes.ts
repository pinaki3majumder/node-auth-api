import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  const { name, email, mobile, password } = req.body;

  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      `INSERT INTO users (name, email, mobile, password)
       VALUES (?, ?, ?, ?)`,
      [name, email, mobile, hashedPassword]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email or Mobile already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const [rows]: any = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 🔐 Generate JWT
    const accessToken  = generateAccessToken({
      id: user.id,
      email: user.email
    });

    const refreshToken = generateRefreshToken({
  id: user.id
});

// Store both tokens in DB
await db.execute(
  'UPDATE users SET refresh_token = ?, access_token = ? WHERE id = ?',
  [refreshToken, accessToken, user.id]
);

    res.json({
      message: 'Login successful',
      accessToken ,
        refreshToken
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    message: 'Protected data',
    user: req.user
  });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const decoded: any = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    );

    const [rows]: any = await db.execute(
      'SELECT * FROM users WHERE id = ? AND refresh_token = ?',
      [decoded.id, refreshToken]
    );

    if (rows.length === 0) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken({
      id: decoded.id,
      email: rows[0].email
    });

    // Replace old access token in DB
await db.execute(
  'UPDATE users SET access_token = ? WHERE id = ?',
  [newAccessToken, decoded.id]
);

    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  await db.execute(
    'UPDATE users SET refresh_token = NULL WHERE id = ?',
    [req.user.id]
  );

  res.json({ message: 'Logged out successfully' });
});

export default router;
