import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { successResponse } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth.middleware';

const authService = new AuthService();

export class AuthController {
  
  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const data = await authService.login(email, password);
      
      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json(successResponse({
        user: data.user,
        accessToken: data.accessToken
      }, 'Login successful'));
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken && req.user) {
        await authService.logout(req.user.userId, refreshToken);
      }
      res.clearCookie('refreshToken');
      res.status(200).json(successResponse(null, 'Logged out successfully'));
    } catch (error) {
      next(error);
    }
  }

  public async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const data = await authService.refreshAccessToken(refreshToken);
      
      res.status(200).json(successResponse({
        accessToken: data.accessToken
      }, 'Token refreshed'));
    } catch (error) {
      next(error);
    }
  }

  public async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getUserById(req.user.userId);
      res.status(200).json(successResponse(user, 'Current user retrieved'));
    } catch (error) {
      next(error);
    }
  }

  public async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { oldPassword, newPassword } = req.body;
      await authService.changePassword(req.user.userId, oldPassword, newPassword);
      res.status(200).json(successResponse(null, 'Password changed successfully'));
    } catch (error) {
      next(error);
    }
  }
}
