import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { MachineService } from '../services/machine.service';
import { AlertService } from '../services/alert.service';
import { DowntimeService } from '../services/downtime.service';
import { OEEService } from '../services/oee.service';
import { DeviceHealthService } from '../services/deviceHealth.service';
import { successResponse } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth.middleware';

const dashboardService = new DashboardService();
const machineService = new MachineService();
const alertService = new AlertService();
const downtimeService = new DowntimeService();
const oeeService = new OEEService();
const deviceHealthService = new DeviceHealthService();

export class AdminController {

  // GET /api/v1/dashboard
  public async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getOverviewStats();
      res.status(200).json(successResponse(stats, 'Dashboard stats retrieved'));
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/machines
  public async getMachines(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page, limit, search, status, factoryId, sortBy, sortOrder
      } = req.query as Record<string, string>;

      const result = await machineService.getMachines({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        status,
        factoryId,
        sortBy,
        sortOrder: (sortOrder === 'asc' ? 'asc' : 'desc'),
      });
      res.status(200).json(successResponse(result.data, 'Machines retrieved', result.pagination));
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/machines/:id
  public async getMachineById(req: Request, res: Response, next: NextFunction) {
    try {
      const machine = await machineService.getMachineById(req.params.id);
      res.status(200).json(successResponse(machine, 'Machine details retrieved'));
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/machines/:id/history
  public async getMachineHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, metrics } = req.query as Record<string, string>;
      const selectedMetrics = metrics ? metrics.split(',') : undefined;

      const history = await machineService.getMachineHistory(
        req.params.id,
        from ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Default last 24h
        to ?? new Date().toISOString(),
        selectedMetrics
      );
      res.status(200).json(successResponse(history, 'Machine history retrieved'));
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/device-health
  public async getDeviceHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const { factoryId } = req.query as Record<string, string>;
      const health = await deviceHealthService.getLatestDeviceHealth(factoryId);
      res.status(200).json(successResponse(health, 'Device health retrieved'));
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/alerts
  public async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, resolved, type, machineId } = req.query as Record<string, string>;
      const result = await alertService.getAlerts({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        resolved: resolved !== undefined ? resolved === 'true' : undefined,
        type,
        machineId,
      });
      res.status(200).json(successResponse(result.data, 'Alerts retrieved', result.pagination));
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/alerts/:id/resolve
  public async resolveAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const alert = await alertService.resolveAlert(req.params.id);
      res.status(200).json(successResponse(alert, 'Alert resolved'));
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/downtime
  public async getDowntime(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, machineId, from, to, active } = req.query as Record<string, string>;
      const result = await downtimeService.getDowntimes({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        machineId,
        from,
        to,
        active: active !== undefined ? active === 'true' : undefined,
      });
      res.status(200).json(successResponse(result.data, 'Downtime records retrieved', result.pagination));
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/oee
  public async getOEE(req: Request, res: Response, next: NextFunction) {
    try {
      const { machineId, from, to } = req.query as Record<string, string>;
      const result = await oeeService.getOEE({ machineId, from, to });
      res.status(200).json(successResponse(result, 'OEE data retrieved'));
    } catch (error) {
      next(error);
    }
  }
}
