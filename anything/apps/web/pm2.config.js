/**
 * PM2 Configuration — Task 4A: Production Process Manager
 *
 * Run with:
 *   pm2 start pm2.config.js
 *   pm2 save
 *   pm2 startup   ← follow the printed command to enable auto-start on reboot
 *
 * Fork mode (NOT cluster) because this is a Next.js serverless/edge app.
 * Cluster mode would break because Next.js already handles its own internal
 * worker pooling. Use multiple PM2 fork instances behind Nginx for horizontal
 * scaling on multi-core servers.
 *
 * Instance count:
 *   - 1 instance per 1 vCPU (recommended for IO-heavy API services)
 *   - Set INSTANCES env var to override (e.g. INSTANCES=2 pm2 start pm2.config.js)
 */

const instances = parseInt(process.env.INSTANCES ?? "1", 10);

module.exports = {
  apps: [
    {
      name: "platformhq-web",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./apps/web",
      instances,
      exec_mode: "fork", // Task 4A: Fork mode, not cluster
      watch: false, // Never watch in production — use CI/CD deploy
      max_memory_restart: "512M", // Restart if process exceeds 512MB (memory leak guard)

      // Environment — override via .env.production or pm2 ecosystem
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Logging
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Crash recovery
      exp_backoff_restart_delay: 100, // Exponential back-off on crash (100ms → 1.6s max)
      min_uptime: "5s", // If it crashes within 5s, count as abnormal exit
      max_restarts: 10, // Stop restarting after 10 consecutive crashes

      // Graceful shutdown — allow in-flight requests to complete
      kill_timeout: 5000, // ms to wait for SIGINT handling before SIGKILL
      listen_timeout: 10000, // ms to wait for app to start listening
    },
  ],
};
