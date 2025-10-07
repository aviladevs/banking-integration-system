import { Router, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await userRepository.findOne({
      where: { id: req.user!.id },
      relations: ['bankAccounts', 'bankConnections'],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      bankAccounts: user.bankAccounts,
      bankConnections: user.bankConnections,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone } = req.body;
    
    const user = await userRepository.findOne({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user data
    if (name) user.name = name;
    if (phone) user.phone = phone;

    await userRepository.save(user);

    return res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
