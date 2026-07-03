import { test, expect } from '@playwright/test';

const testVehicle = {
  category: 'Cars',
  brand: 'Test',
  model: 'AI Test',
  year: 2024,
  plate: 'AI-TEST-001',
  market_price: 100000,
};

function getBaseURL(): string {
  const env = (globalThis as any)?.process?.env as Record<string, string | undefined> | undefined;
  return env?.BASE_URL || 'http://localhost:3000';
}

const baseURL = getBaseURL();

function api(pathWithQuery: string) {
  const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const path = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  return `${base}${path}`;
}

async function loginAndCreateAuthedRequest(request: any) {
  const username = 'admin';
  const password = 'Password123!';

  const loginRes = await request.post(api('/api/auth/login'), {
    data: { username, password },
  });

  expect(loginRes.status()).toBe(200);

  const setCookieHeaders: string[] = loginRes.headers()['set-cookie'] ?? [];
  const cookieHeader = setCookieHeaders
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ');

  expect(cookieHeader).toBeTruthy();

  return request.newContext({
    baseURL,
    extraHTTPHeaders: {
      Cookie: cookieHeader,
    },
  });
}

test.describe('Vehicles CRUD', () => {
  test('GET vehicles list', async ({ request }) => {
    const authed = await loginAndCreateAuthedRequest(request);

    const res = await authed.get(api('/api/vehicles?limit=5'));
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('POST create vehicle', async ({ request }) => {
    const authed = await loginAndCreateAuthedRequest(request);

    const res = await authed.post(api('/api/vehicles'), {
      data: testVehicle,
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toHaveProperty('VehicleId');
  });

  test('DELETE vehicle (use ID from create if known)', async ({ request }) => {
    const authed = await loginAndCreateAuthedRequest(request);

    const res = await authed.delete(api('/api/vehicles?id=1')); // Test ID, expect 200 or 404
    expect(res.status()).toBeLessThan(500);
  });
});
