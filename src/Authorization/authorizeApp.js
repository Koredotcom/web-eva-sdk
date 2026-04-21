const SSO_LOGIN_BASE_URL = "https://work-qa.kore.ai/api/1.1/sdk";

const base64UrlDecode = (input) => {
    if (!input || typeof input !== "string") return null;
    let str = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = str.length % 4;
    if (pad === 2) str += "==";
    else if (pad === 3) str += "=";
    else if (pad !== 0) return null;

    if (typeof atob === "function") {
        try {
            const binary = atob(str);
            const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
            return new TextDecoder("utf-8").decode(bytes);
        } catch (err) {
            return null;
        }
    }
    if (typeof Buffer !== "undefined") {
        try {
            return Buffer.from(str, "base64").toString("utf-8");
        } catch (err) {
            return null;
        }
    }
    return null;
};

const decodeJwtPayload = (jwt) => {
    if (!jwt || typeof jwt !== "string") return null;
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const json = base64UrlDecode(parts[1]);
    if (!json) return null;
    try {
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
        // body may be empty / non-JSON
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
 * Authorize an app against the AI4W SSO endpoint.
 *
 * @param {Object} params
 * @param {string} params.jwt       Required. The id_token (JWT) issued for this user/app.
 * @param {string} params.emailId   Required. The user's email.
 * @param {string} [params.client_id] Optional. If omitted, decoded from the JWT payload (`appId`).
 * @returns {Promise<{ status: "success" | "failed", data: any, error?: { message: string }, clientId?: string }>}
 */
export const authorizeApp = async ({ jwt, emailId, client_id=null } = {}) => {
    if (!jwt || typeof jwt !== "string") {
        return {
            status: "failed",
            error: { message: "jwt is required" },
            data: null,
        };
    }

    if (!emailId || typeof emailId !== "string") {
        return {
            status: "failed",
            error: { message: "emailId is required" },
            data: null,
        };
    }

    let clientId = client_id;
    if (!clientId) {
        const payload = decodeJwtPayload(jwt);
        clientId = payload?.appId;
        if (!clientId) {
            return {
                status: "failed",
                error: {
                    message:
                        "client_id was not provided and could not be derived from the jwt (no appId in payload)",
                },
                data: null,
            };
        }
    }

    const url = `${SSO_LOGIN_BASE_URL}/${encodeURIComponent(clientId)}/sso/login`;
    const ssoPayload = { id_token: jwt, emailId };

    try {
        const ssoResponse = await fetchJson(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ssoPayload),
        });
        return { status: "success", data: ssoResponse, clientId };
    } catch (err) {
        return {
            status: "failed",
            error: {
                message: err?.message || "SSO login request failed",
                status: err?.status,
                data: err?.data,
            },
            data: null,
            clientId,
        };
    }
};

export default authorizeApp;
