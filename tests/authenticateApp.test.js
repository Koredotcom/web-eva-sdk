/**
 * Verifies the public SSO authentication contract without calling a real
 * identity service, including token validation, client ID derivation, SDK
 * initialization, and malformed login responses.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({
  initializeSDK: vi.fn().mockResolvedValue(undefined),
}));

import { initializeSDK } from '../src/config.js';
import { authenticateApp } from '../src/Authorization/authenticateApp.js';

describe('authenticateApp', () => {
  // Replaces the browser network call with a controllable mock for each test.
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  // Confirms invalid input fails early and does not trigger network activity.
  it('rejects a missing ID token without making a network request', async () => {
    const result = await authenticateApp();

    expect(result).toEqual({
      status: 'failed',
      error: { message: 'id_token is required' },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  // Confirms a valid JWT can provide the client ID and that successful SSO
  // credentials are passed into SDK initialization.
  it('derives the client ID from the JWT and initializes the SDK after SSO', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ appId: 'client-42' })).toString('base64url');
    const token = `${header}.${payload}.signature`;
    const loginResponse = {
      authorization: { accessToken: 'access-token' },
      userInfo: { id: 'user-42' },
    };
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(loginResponse),
    });

    const result = await authenticateApp({
      id_token: token,
      base_url: 'https://example.test/',
      sdkConfig: { enableDebugging: false },
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://example.test/api/1.1/sdk/client-42/sso/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ id_token: token }),
      }),
    );
    expect(initializeSDK).toHaveBeenCalledWith({
      accessToken: 'access-token',
      userId: 'user-42',
      api_url: 'https://example.test/api/1.1/sdk/client-42',
      presence_url: 'https://example.test/',
      enableDebugging: false,
    });
    expect(result).toMatchObject({ status: 'success', clientId: 'client-42' });
  });

  // Confirms the authentication API returns a useful failure when the SSO
  // endpoint responds successfully but omits required credentials.
  it('returns a structured failure when SSO does not provide credentials', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ userInfo: { id: 'user-42' } }),
    });

    const result = await authenticateApp({
      id_token: 'token',
      client_id: 'client-42',
    });

    expect(result).toMatchObject({
      status: 'failed',
      clientId: 'client-42',
      error: { message: expect.stringContaining('missing accessToken or userId') },
    });
    expect(initializeSDK).not.toHaveBeenCalled();
  });
});
