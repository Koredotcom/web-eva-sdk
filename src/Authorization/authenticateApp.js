import { initializeSDK } from "../config";

const DEFAULT_BASE_URL = "https://work-qa.kore.ai/";

/**
 * Decode the payload of a JWT (id_token) without verifying its signature.
 * Returns the parsed JSON payload, or null if the token is malformed.
 */
const decodeJwtPayload = (jwt) => {
  if (!jwt || typeof jwt !== "string") return null;
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;

  let str = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const pad = str.length % 4;
  if (pad === 2) str += "==";
  else if (pad === 3) str += "=";
  else if (pad !== 0) return null;

  try {
    let json;
    if (typeof atob === "function") {
      const binary = atob(str);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      json = new TextDecoder("utf-8").decode(bytes);
    } else if (typeof Buffer !== "undefined") {
      json = Buffer.from(str, "base64").toString("utf-8");
    } else {
      return null;
    }
    return JSON.parse(json);
  } catch (err) {
    return null;
  }
};

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    /* body may be empty / non-JSON */
  }
  if (!response.ok) {
    const error = new Error(
      (data && (data.message || data.error || data.errMsg)) ||
        `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

/**
 * Authenticate a client app against the AI4W SSO endpoint and, on success,
 * boot the SDK by calling `initializeSDK` with the returned credentials.
 *
 * @param {Object}  params
 * @param {string}  params.id_token      Required. The id_token (JWT) issued for this user/app.
 * @param {string} [params.client_id]    Optional. If omitted, decoded from the JWT payload (`appId`).
 * @param {string} [params.api_url]      Optional. Defaults to `${BASE_URL}api/1.1/sdk/${CLIENT_ID}`.
 * @param {string} [params.presence_url] Optional. Defaults to `${BASE_URL}`.
 * @param {boolean} [params.skipInitializeSDK] When true, SSO runs but `initializeSDK` is not called. Use with `EvaSDK.chatBot.init` so the floating chat mounts first.
 * @returns {Promise<{ status: "success" | "failed", data?: any, error?: { message: string, status?: number, data?: any }, clientId?: string, accessToken?: string, userId?: string, api_url?: string, presence_url?: string }>}
 */
export const authenticateApp = async ({
  id_token,
  client_id = null,
  base_url = null,
  api_url = null,
  presence_url = null,
  skipInitializeSDK = false,
} = {}) => {

  if (!id_token || typeof id_token !== "string") {
    return {
      status: "failed",
      error: { message: "id_token is required" },
    };
  }

  let clientId = client_id;
  if (!clientId) {
    const payload = decodeJwtPayload(id_token);
    clientId = payload?.appId;
    if (!clientId) {
      return {
        status: "failed",
        error: {
          message:
            "client_id was not provided and could not be derived from id_token (no `appId` in JWT payload)",
        },
      };
    }
  }

  const BASE_URL = base_url || DEFAULT_BASE_URL;
  // The SDK's data-API thunks (e.g. `1.1/ka/users/.../sdk/config`) prepend their
  // own `1.1/...` path, so the baseURL passed to axios must end at `/api/` — NOT
  // at `/api/1.1/sdk/{clientId}/` (which is only the SSO login endpoint shape).
  // Using the SSO shape causes paths like `…/api/1.1/sdk/cs-xxx/1.1/ka/…` → 404.
  const resolvedApiUrl = api_url || `${BASE_URL}api/1.1/sdk/${clientId}`;
  const resolvedPresenceUrl = presence_url || `${BASE_URL}`;

  const AI4W_LOGIN_URL = `${BASE_URL}api/1.1/sdk/${clientId}/sso/login`;

  let loginResponse;
  try {
    loginResponse = await fetchJson(AI4W_LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token }),
    });
  } catch (err) {
    return {
      status: "failed",
      error: {
        message: err?.message || "SSO login request failed",
        status: err?.status,
        data: err?.data,
      },
      clientId,
    };
  }

  const accessToken =
    loginResponse?.authorization?.accessToken ||
    loginResponse?.data?.authorization?.accessToken ||
    loginResponse?.accessToken;

  const userId =
    loginResponse?.userInfo?.id ||
    loginResponse?.data?.userInfo?.id ||
    loginResponse?.userId;

  if (!accessToken || !userId) {
    return {
      status: "failed",
      error: {
        message:
          "SSO login succeeded but response is missing accessToken or userId",
        data: loginResponse,
      },
      clientId,
    };
  }

  if (skipInitializeSDK) {
    return {
      status: "success",
      data: loginResponse,
      clientId,
      accessToken,
      userId,
      api_url: resolvedApiUrl,
      presence_url: resolvedPresenceUrl,
    };
  }

  try {
    await initializeSDK({
      accessToken,
      userId,
      api_url: resolvedApiUrl,
      presence_url: resolvedPresenceUrl,
    });
  } catch (err) {
    return {
      status: "failed",
      error: {
        message: err?.message || "SDK initialization failed after SSO login",
        data: err?.data,
      },
      clientId,
    };
  }

  return {
    status: "success",
    data: loginResponse,
    clientId,
  };
};

export default authenticateApp;
