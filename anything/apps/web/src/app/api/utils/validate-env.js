/**
 * validateEnv()
 *
 * Call once at the start of any API route or service that requires
 * critical environment variables. Throws with a clear diagnostic message
 * listing every missing variable so ops can fix them all at once.
 *
 * Usage:
 *   import { validateEnv } from "@/app/api/utils/validate-env";
 *   validateEnv(); // throws if anything is missing
 */

const REQUIRED_VARS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "INTEGRATION_ENCRYPTION_KEY",
];

const WARNED_OPTIONAL = [
  "RESEND_API_KEY", // emails degrade gracefully without it
  "CRON_SECRET", // retry worker skips auth check without it
];

let validated = false;

export function validateEnv() {
  if (validated) return; // only check once per cold start

  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    const list = missing.map((v) => `  • ${v}`).join("\n");
    throw new Error(
      `[validateEnv] Server startup aborted — missing required environment variables:\n${list}\n\n` +
        `Copy .env.example to .env.local and fill in the values before starting.`,
    );
  }

  // Warn about optional-but-important vars
  for (const v of WARNED_OPTIONAL) {
    if (!process.env[v]) {
      console.warn(
        `[validateEnv] WARNING: ${v} is not set — some features will be degraded.`,
      );
    }
  }

  // Validate INTEGRATION_ENCRYPTION_KEY length (must be 32 bytes for AES-256)
  const encKey = process.env.INTEGRATION_ENCRYPTION_KEY ?? "";
  if (encKey && Buffer.byteLength(encKey, "utf8") < 32) {
    throw new Error(
      `[validateEnv] INTEGRATION_ENCRYPTION_KEY must be at least 32 bytes (currently ${Buffer.byteLength(encKey, "utf8")} bytes). ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }

  validated = true;
}

/** Reset validation state (useful in tests) */
export function _resetValidation() {
  validated = false;
}
