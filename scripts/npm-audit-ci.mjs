import { spawnSync } from "node:child_process";

const npmExecutable = process.env.npm_execpath;
const command = npmExecutable ? process.execPath : "npm";
const auditArguments = ["audit", "--omit=dev", "--audit-level=high", "--json"];
const result = spawnSync(
  command,
  npmExecutable ? [npmExecutable, ...auditArguments] : auditArguments,
  {
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_fetch_retries: "1",
      npm_config_fetch_retry_maxtimeout: "30000",
      npm_config_fetch_timeout: "120000",
    },
    maxBuffer: 10 * 1024 * 1024,
  },
);

const stdout = result.stdout || "";
const stderr = result.stderr || "";
let report;

try {
  report = stdout.trim() ? JSON.parse(stdout) : undefined;
} catch {
  report = undefined;
}

const vulnerabilities = report?.metadata?.vulnerabilities;
const highOrCritical = Number(vulnerabilities?.high || 0) + Number(vulnerabilities?.critical || 0);

if (result.status === 0) {
  process.stdout.write(stdout);
  process.exit(0);
}

if (report && highOrCritical > 0) {
  process.stdout.write(stdout);
  process.stderr.write(`npm audit found ${highOrCritical} high or critical production vulnerability findings.\n`);
  process.exit(result.status || 1);
}

const diagnostic = `${stdout}\n${stderr}\n${result.error?.message || ""}`;
const registryFailure = /audit endpoint returned an error|network timeout|econnreset|econnrefused|enotfound|eai_again|etimedout|socket hang up|service unavailable|bad gateway|gateway timeout/i.test(diagnostic);

if (registryFailure) {
  process.stderr.write("::warning::npm audit registry was unavailable; application verification passed, but the security audit should be retried.\n");
  process.stderr.write(stderr);
  process.exit(0);
}

process.stdout.write(stdout);
process.stderr.write(stderr);
if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exit(result.status || 1);
