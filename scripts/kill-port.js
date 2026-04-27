/* eslint-disable no-console */
const { execSync } = require("node:child_process");

function run(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
}

function killWindows(port) {
  const out = run(`netstat -ano | findstr :${port} | findstr LISTENING`);
  const lines = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const pids = new Set();
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== "0") pids.add(pid);
  }

  for (const pid of pids) {
    try {
      run(`taskkill /PID ${pid} /F`);
      console.log(`Freed port ${port} (killed PID ${pid}).`);
    } catch (e) {
      console.warn(`Failed to kill PID ${pid} for port ${port}. Continuing.`);
    }
  }
}

function killPosix(port) {
  const out = run(`lsof -ti tcp:${port} || true`);
  const pids = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const pid of pids) {
    try {
      run(`kill -9 ${pid}`);
      console.log(`Freed port ${port} (killed PID ${pid}).`);
    } catch {
      // ignore
    }
  }
}

function main() {
  const port = Number(process.argv[2] || 4000);
  if (!Number.isFinite(port) || port <= 0) {
    console.error("Usage: node scripts/kill-port.js <port>");
    process.exit(2);
  }

  try {
    if (process.platform === "win32") killWindows(port);
    else killPosix(port);
  } catch {
    // If there was nothing listening, netstat/findstr may error; that's fine.
  }
}

main();

