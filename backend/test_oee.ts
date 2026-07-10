import { OEEService } from './src/services/oee.service';

async function main() {
  const oeeService = new OEEService();
  try {
    const res = await oeeService.getOEE({});
    console.log('OEE SERVICE RESULT:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('OEE SERVICE ERROR:', e);
  }
  process.exit(0);
}

main();

