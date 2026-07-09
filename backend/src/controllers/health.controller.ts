import { Request, Response } from 'express';
import { successResponse } from '../utils/apiResponse';
import { prisma } from '../prisma/client';
import { mqttClient } from '../mqtt/client';

export class HealthController {
  public async getHealth(req: Request, res: Response) {
    let dbStatus = 'Disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'Connected';
    } catch (e) {
      dbStatus = 'Error';
    }

    const healthData = {
      api: 'Running',
      database: dbStatus,
      mqtt: mqttClient.getStatus(),
      uptime: process.uptime(),
      version: '1.0.0',
    };

    const isHealthy = dbStatus === 'Connected' && mqttClient.isConnected;
    
    // Even if degraded, we return 200 to not fail basic load balancers unless absolutely dead
    res.status(200).json(successResponse(healthData, isHealthy ? 'System Healthy' : 'System Degraded'));
  }
}
