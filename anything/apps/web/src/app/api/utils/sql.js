import { neon } from "@neondatabase/serverless";

// Task 4B: Neon connection pooling.
// Point DATABASE_URL to the Neon pooled endpoint (use the "-pooler" variant from Neon dashboard):
//   postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
// The keepalive option reuses TCP connections within the same serverless warm window.
const NEON_OPTIONS = {
  fetchOptions: { keepalive: true },
};

const NullishQueryFunction = () => {
  throw new Error(
    "No database connection string was provided to `neon()`. Perhaps process.env.DATABASE_URL has not been set",
  );
};
NullishQueryFunction.transaction = () => {
  throw new Error(
    "No database connection string was provided to `neon()`. Perhaps process.env.DATABASE_URL has not been set",
  );
};

const sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL, NEON_OPTIONS)
  : NullishQueryFunction;

export default sql;
