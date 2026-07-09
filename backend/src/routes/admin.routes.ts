import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { verifyJwt } from '../middleware/auth.middleware';
import { verifyRoles } from '../middleware/auth.middleware';

const router = Router();
const adminController = new AdminController();

// All admin routes are protected by JWT authentication.
// Only SUPER_ADMIN, ADMIN, and SUPERVISOR roles may access these APIs.
// VIEWER role gets read-only access to dashboard and machines.
router.use(verifyJwt);

// ============================================================
// DASHBOARD OVERVIEW
// ============================================================
router.get('/dashboard', adminController.getDashboard.bind(adminController));

// ============================================================
// MACHINES
// ============================================================
router.get('/machines', adminController.getMachines.bind(adminController));
router.get('/machines/:id', adminController.getMachineById.bind(adminController));
router.get('/machines/:id/history', adminController.getMachineHistory.bind(adminController));

// ============================================================
// DEVICE HEALTH
// ============================================================
router.get('/device-health', adminController.getDeviceHealth.bind(adminController));

// ============================================================
// ALERTS
// ============================================================
router.get('/alerts', adminController.getAlerts.bind(adminController));
router.patch(
  '/alerts/:id/resolve',
  verifyRoles('SUPER_ADMIN', 'ADMIN'),
  adminController.resolveAlert.bind(adminController)
);

// ============================================================
// DOWNTIME
// ============================================================
router.get('/downtime', adminController.getDowntime.bind(adminController));

// ============================================================
// OEE
// ============================================================
router.get('/oee', adminController.getOEE.bind(adminController));

export default router;
