export const config = {
  appName: 'ManufactureIQ Admin',
  appVersion: '1.0.0',
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
    timeout: 15000,
  },
  socket: {
    url: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000',
  },
  auth: {
    accessTokenKey: 'mfg_access_token',
    userKey: 'mfg_user',
  },
} as const;

export type AppConfig = typeof config;
