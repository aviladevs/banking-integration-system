import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { authRateLimiter } from '../middleware/security';
import { requireStrongPassword, auditSecurity, sanitizeInput } from '../middleware/security';

const router = Router();

async function getUserRepoOrServiceUnavailable(res: Response) {
  if (!AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
    } catch (err: any) {
      console.error('Database not available:', err?.message || err);
      res.status(503).json({ error: 'Serviço indisponível: banco de dados não conectado' });
      return undefined;
    }
  }
  try {
    return AppDataSource.getRepository(User);
  } catch (err: any) {
    console.error('Repository error:', err?.message || err);
    res.status(503).json({ error: 'Serviço indisponível: repositório não disponível' });
    return undefined;
  }
}

// Register
router.post('/register', 
  authRateLimiter, 
  sanitizeInput,
  requireStrongPassword,
  auditSecurity('user_registration', 'medium'),
  async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    const userRepository = await getUserRepoOrServiceUnavailable(res);
    if (!userRepository) return; // response already sent

    // Check if user already exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = userRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
    });

    try {
      await userRepository.save(user);
    } catch (e: any) {
      // Handle unique constraint just in case of race condition
      if (e?.code === '23505') {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }
      throw e;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error?.message || error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', 
  authRateLimiter, 
  sanitizeInput,
  auditSecurity('user_login', 'medium'),
  async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const userRepository = await getUserRepoOrServiceUnavailable(res);
    if (!userRepository) return; // response already sent

    // Find user
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error?.message || error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;