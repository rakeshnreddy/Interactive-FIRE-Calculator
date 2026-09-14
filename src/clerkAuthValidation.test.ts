import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { requireClerkAuth, type ClerkEnv } from "../functions/_lib/session";

describe("requireClerkAuth (B05 real SDK token validation)", () => {
  // Generate a disposable local RSA key pair for local JWT signing and verification
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  // Generate an untrusted secondary key pair to test signature forgery rejection
  const { privateKey: untrustedPrivateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  const domain = "example-domain-12.clerk.accounts.dev$";
  const publishableKey = "pk_test_" + Buffer.from(domain).toString("base64").replace(/=+$/, "");
  const secretKey = "sk_test_synthetic12345678901234567890";

  const baseEnv: ClerkEnv = {
    CLERK_PUBLISHABLE_KEY: publishableKey,
    CLERK_SECRET_KEY: secretKey,
    CLERK_JWT_KEY: publicKey,
    CLERK_AUTHORIZED_PARTIES: "http://localhost,https://calculator.example.com"
  };

  function base64url(input: string | Buffer): string {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  function createSignedJwt(payload: Record<string, unknown>, signingKey: crypto.KeyObject | string = privateKey): string {
    const header = { alg: "RS256", typ: "JWT" };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(dataToSign);
    const signature = signer.sign(signingKey, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    return `${dataToSign}.${signature}`;
  }

  it("returns 503 when Clerk environment is unconfigured or missing keys", async () => {
    const req = new Request("http://localhost/api/accounts");
    const emptyEnvRes = await requireClerkAuth(req, {});
    expect(emptyEnvRes.ok).toBe(false);
    if (!emptyEnvRes.ok) {
      expect(emptyEnvRes.response.status).toBe(503);
      const data = await emptyEnvRes.response.json();
      expect(data).toEqual({ authConfigured: false });
    }

    const partialEnvRes = await requireClerkAuth(req, { CLERK_PUBLISHABLE_KEY: "pk_test_sample" });
    expect(partialEnvRes.ok).toBe(false);
    if (!partialEnvRes.ok) {
      expect(partialEnvRes.response.status).toBe(503);
    }
  });

  it("rejects request when token is completely absent", async () => {
    const req = new Request("http://localhost/api/accounts", {
      headers: { Origin: "http://localhost" }
    });
    const result = await requireClerkAuth(req, baseEnv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    }
  });

  it("rejects request with malformed / garbage Authorization header", async () => {
    const req = new Request("http://localhost/api/accounts", {
      headers: {
        Authorization: "Bearer definitely_not_a_valid_jwt_structure",
        Origin: "http://localhost"
      }
    });
    const result = await requireClerkAuth(req, baseEnv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    }
  });

  it("rejects expired token fixture", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiredToken = createSignedJwt({
      sub: "user_test_expired",
      iat: nowSeconds - 7200,
      nbf: nowSeconds - 7200,
      exp: nowSeconds - 3600, // Expired 1 hour ago
      iss: "https://example-domain-12.clerk.accounts.dev",
      azp: "http://localhost"
    });

    const req = new Request("http://localhost/api/accounts", {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
        Origin: "http://localhost"
      }
    });

    const result = await requireClerkAuth(req, baseEnv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    }
  });

  it("rejects token forged with an untrusted key (signature mismatch)", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const forgedToken = createSignedJwt(
      {
        sub: "user_test_forged",
        iat: nowSeconds,
        nbf: nowSeconds,
        exp: nowSeconds + 3600,
        iss: "https://example-domain-12.clerk.accounts.dev",
        azp: "http://localhost"
      },
      untrustedPrivateKey
    );

    const req = new Request("http://localhost/api/accounts", {
      headers: {
        Authorization: `Bearer ${forgedToken}`,
        Origin: "http://localhost"
      }
    });

    const result = await requireClerkAuth(req, baseEnv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects token with unauthorized origin / party (azp mismatch)", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const wrongAzpToken = createSignedJwt({
      sub: "user_test_wrong_azp",
      iat: nowSeconds,
      nbf: nowSeconds,
      exp: nowSeconds + 3600,
      iss: "https://example-domain-12.clerk.accounts.dev",
      azp: "https://unauthorized-attacker.example.com"
    });

    const req = new Request("http://localhost/api/accounts", {
      headers: {
        Authorization: `Bearer ${wrongAzpToken}`,
        Origin: "https://unauthorized-attacker.example.com"
      }
    });

    const result = await requireClerkAuth(req, baseEnv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    }
  });

  it("authenticates valid token signed by configured key with authorized origin", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const validToken = createSignedJwt({
      sub: "user_synthetic_verified_42",
      iat: nowSeconds,
      nbf: nowSeconds,
      exp: nowSeconds + 3600,
      iss: "https://example-domain-12.clerk.accounts.dev",
      azp: "http://localhost"
    });

    const req = new Request("http://localhost/api/accounts", {
      headers: {
        Authorization: `Bearer ${validToken}`,
        Origin: "http://localhost"
      }
    });

    const result = await requireClerkAuth(req, baseEnv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auth.userId).toBe("user_synthetic_verified_42");
    }
  });

  it("authenticates valid token matching second authorized party in list", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const validToken = createSignedJwt({
      sub: "user_synthetic_multi_origin",
      iat: nowSeconds,
      nbf: nowSeconds,
      exp: nowSeconds + 3600,
      iss: "https://example-domain-12.clerk.accounts.dev",
      azp: "https://calculator.example.com"
    });

    const req = new Request("https://calculator.example.com/api/profile", {
      headers: {
        Authorization: `Bearer ${validToken}`,
        Origin: "https://calculator.example.com"
      }
    });

    const result = await requireClerkAuth(req, baseEnv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auth.userId).toBe("user_synthetic_multi_origin");
    }
  });
});
