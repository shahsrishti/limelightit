import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { verifyJwt } from '../middleware/auth.middleware';
import { loginSchema, changePasswordSchema } from '../validators/auth.validator';
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const router = Router();
const authController = new AuthController();

// Quick Zod validation middleware wrapper
const validate = (schema: z.AnyZodObject) => 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err: any) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: err.errors });
    }
  };

router.post('/login', validate(loginSchema), authController.login.bind(authController));
router.post('/logout', verifyJwt, authController.logout.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.get('/me', verifyJwt, authController.getCurrentUser.bind(authController));
router.post('/change-password', verifyJwt, validate(changePasswordSchema), authController.changePassword.bind(authController));

export default router;
