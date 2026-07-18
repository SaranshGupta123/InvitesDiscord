/**
 * Process Manager — single-file script that launches and babysits
 * multiple Node scripts (your 5 bots) as child processes, and
 * automatically restarts any of them if they crash.
 * -----------------------------------------------------
 * Setup:
 *   No extra npm installs needed — uses only Node's built-in child_process.
 *   Just make sure this file sits in the SAME folder as index.js,
 *   index2.js, index3.js, index4.js, index5.js (or edit the SCRIPTS list
 *   below to point at wherever they actually are).
 *
 * Which scripts does it manage?
 *   By default it auto-discovers every file in this folder matching
 *   index.js, index2.js, index3.js, ... indexN.js and manages whichever
 *   ones actually exist — so the SAME manager.js works unmodified on
 *   different machines running different subsets (e.g. PC #1 has
 *   index.js + index2.js, PC #2 has index3.js + index7.js + index8.js).
 *
 *   If you'd rather list them explicitly instead of auto-discovering,
 *   add this to your .env (comma-separated, no spaces needed):
 *     MANAGED_SCRIPTS=index.js,index2.js,index7.js
 *
 * Run:
 *   node manager.js
 *
 * What it does:
 *   - Starts every discovered/listed script as its own child process
 *   - Prefixes each process's console output with a colored [name] tag,
 *     so you can tell which bot logged what in one shared terminal
 *   - If a process crashes or exits, it's restarted automatically after
 *     a short delay
 *   - Uses exponential backoff for processes that keep crash-looping
 *     (3s, 6s, 12s, up to a 30s cap) so a broken bot doesn't spam
 *     restarts forever — but if a process runs stably for a while, its
 *     backoff resets back to 3s
 *   - Ctrl+C (or a SIGTERM) shuts every child down cleanly instead of
 *     just killing this manager and leaving orphans running
 *
 * Note: this manager itself needs to stay running 24/7 for your bots to
 * stay up — it doesn't make them survive your own machine turning off.
 * If you're looking for that, this is the same kind of tool as `pm2`,
 * just self-contained in one file so you can see exactly what it does.
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
try {
  require("dotenv").config();
} catch {
  // dotenv not installed — fine, MANAGED_SCRIPTS just won't be read from .env
}

// ---------- figure out which scripts to manage ----------

function naturalIndexNumber(filename) {
  // "index.js" -> 1, "index2.js" -> 2, "index10.js" -> 10 (so sorting is numeric, not alphabetical)
  const match = /^index(\d*)\.js$/.exec(filename);
  if (!match) return null;
  return match[1] === "" ? 1 : parseInt(match[1], 10);
}

function discoverScripts() {
  return fs
    .readdirSync(__dirname)
    .filter((f) => naturalIndexNumber(f) !== null)
    .sort((a, b) => naturalIndexNumber(a) - naturalIndexNumber(b))
    .map((f) => ({ name: path.basename(f, ".js"), file: f }));
}

function scriptsFromEnv() {
  return process.env.MANAGED_SCRIPTS.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((f) => ({ name: path.basename(f, ".js"), file: f }));
}

const SCRIPTS = process.env.MANAGED_SCRIPTS
  ? scriptsFromEnv()
  : discoverScripts();

if (SCRIPTS.length === 0) {
  console.error(
    "No scripts found to manage. Either put index.js / index2.js / etc. next to manager.js, " +
      "or set MANAGED_SCRIPTS=index.js,index2.js in your .env.",
  );
  process.exit(1);
}

const BASE_RESTART_DELAY_MS = 3000;
const MAX_RESTART_DELAY_MS = 30000;
const STABLE_UPTIME_MS = 60000; // if a process survives this long, reset its backoff

// ---------- output formatting ----------

const COLORS = [
  "\x1b[36m",
  "\x1b[35m",
  "\x1b[33m",
  "\x1b[32m",
  "\x1b[34m",
  "\x1b[31m",
];
const RESET = "\x1b[0m";

function log(name, colorIndex, ...args) {
  const color = COLORS[colorIndex % COLORS.length];
  const time = new Date().toLocaleTimeString();
  console.log(`${color}[${time}] [${name}]${RESET}`, ...args);
}

// ---------- process supervision ----------

const states = new Map(); // name -> { process, restarts, currentDelay, startedAt }
let shuttingDown = false;

function startScript(script, colorIndex) {
  if (shuttingDown) return;

  const filePath = path.join(__dirname, script.file);

  if (!fs.existsSync(filePath)) {
    log(
      script.name,
      colorIndex,
      `⚠ file not found at ${filePath} — skipping. Fix the path in SCRIPTS and restart the manager.`,
    );
    return;
  }

  const state = states.get(script.name) || {
    restarts: 0,
    currentDelay: BASE_RESTART_DELAY_MS,
  };

  const child = spawn(process.execPath, [filePath], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  state.process = child;
  state.startedAt = Date.now();
  states.set(script.name, state);

  log(script.name, colorIndex, `started (pid ${child.pid})`);

  child.stdout.on("data", (data) => {
    data
      .toString()
      .split("\n")
      .filter(Boolean)
      .forEach((line) => log(script.name, colorIndex, line));
  });

  child.stderr.on("data", (data) => {
    data
      .toString()
      .split("\n")
      .filter(Boolean)
      .forEach((line) => log(script.name, colorIndex, "⚠", line));
  });

  child.on("error", (err) => {
    log(script.name, colorIndex, `⚠ failed to start:`, err.message);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;

    const uptime = Date.now() - state.startedAt;
    log(
      script.name,
      colorIndex,
      `exited (code=${code}, signal=${signal}) after ${(uptime / 1000).toFixed(1)}s`,
    );

    if (uptime > STABLE_UPTIME_MS) {
      // ran fine for a while before dying — don't punish it with a long delay
      state.restarts = 0;
      state.currentDelay = BASE_RESTART_DELAY_MS;
    } else {
      state.restarts += 1;
      state.currentDelay = Math.min(
        state.currentDelay * 2,
        MAX_RESTART_DELAY_MS,
      );
    }

    log(
      script.name,
      colorIndex,
      `restarting in ${(state.currentDelay / 1000).toFixed(1)}s (attempt #${state.restarts + 1})`,
    );

    setTimeout(() => startScript(script, colorIndex), state.currentDelay);
  });
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nReceived ${signal} — shutting down all managed processes...`);

  for (const [name, state] of states) {
    if (state.process && !state.process.killed) {
      state.process.kill("SIGTERM");
    }
  }

  // Give children a couple seconds to exit cleanly, then force-quit the manager
  setTimeout(() => {
    console.log("Shutdown complete.");
    process.exit(0);
  }, 2000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---------- go ----------

console.log(
  `Starting ${SCRIPTS.length} managed process(es): ${SCRIPTS.map((s) => s.file).join(", ")}\n`,
);
SCRIPTS.forEach((script, i) => startScript(script, i));
