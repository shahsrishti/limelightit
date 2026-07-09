import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

const prisma = new PrismaClient();

export class AuthService {
  private generateTokens(userId: string, role: string) {
    const accessToken = jwt.sign(
      { userId, role },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  public async login(email: string, passwordString: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(passwordString, user.password);
    
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const { accessToken, refreshToken } = this.generateTokens(user.id, user.role.name);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken
    };
  }

  public async refreshAccessToken(token: string | undefined) {
    if (!token) {
      throw new AppError('No refresh token provided', 401);
    }

    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
      
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: { include: { role: true } } }
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        if (storedToken) {
          await prisma.refreshToken.delete({ where: { token } });
        }
        throw new AppError('Refresh token expired or invalid', 401);
      }

      const { accessToken, refreshToken } = this.generateTokens(storedToken.user.id, storedToken.user.role.name);

      // Rotate refresh token
      await prisma.refreshToken.delete({ where: { token } });
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: storedToken.user.id,
          expiresAt
        }
      });

      return { accessToken, refreshToken };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  public async logout(userId: string, refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken
      }
    });
  }

  public async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  public async changePassword(userId: string, oldPasswordString: string, newPasswordString: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const isPasswordValid = await bcrypt.compare(oldPasswordString, user.password);
    if (!isPasswordValid) throw new AppError('Invalid old password', 400);

    const hashedPassword = await bcrypt.hash(newPasswordString, 10);
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
    
    // Invalidate all active sessions
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
