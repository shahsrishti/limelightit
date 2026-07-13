import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/prisma/client';

// Mock Redis connection
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      connect: jest.fn().mockResolvedValue(null),
      status: 'ready',
    };
  });
});

// Mock BullMQ queues
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: '1' }),
    getJobCounts: jest.fn().mockResolvedValue({ active: 0, waiting: 0 }),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));

// Mock Prisma
jest.mock('../src/prisma/client', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
    machine: {
      count: jest.fn().mockResolvedValue(10),
    },
    machineStatus: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe('GET /api/v1/health', () => {
  it('should return 200 and system UP when database responds successfully', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
  });

  it('should return system DEGRADED when database query fails', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('DB connection failed'));
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe('DEGRADED');
  });
});
