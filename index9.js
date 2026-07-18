require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

/**
 * Bump Reminder Bot — single-file Discord bot
 * -----------------------------------------------------
 * Watches for DISBOARD's "Bump done!" confirmation message, then pings you
 * (or a role) directly when the cooldown is over so bumping doesn't get
 * missed.
 *
 * IMPORTANT — what this bot does NOT do: it does not, and will not, run
 * /bump on your behalf automatically. Doing that requires simulating a
 * real user account (a "self-bot"), which is against Discord's Terms of
 * Service and risks account termination. This bot only watches and
 * reminds — a human still has to type /bump.
 *
 * Setup:
 *   1. npm install discord.js dotenv
 *   2. In the Developer Portal → your app → Bot, enable "Message Content
 *      Intent" (needed to read DISBOARD's confirmation embed).
 *   3. .env:
 *        DISCORD_TOKEN=your_bot_token
 *        GUILD_ID=your_server_id
 *        BUMP_CHANNEL_ID=channel_id_where_bump_is_used
 *        REMINDER_ROLE_ID=role_id_to_ping        # optional
 *        REMINDER_USER_IDS=userId1,userId2       # optional, pinged directly
 *        COOLDOWN_MINUTES=120                     # optional, defaults to 120
 *   4. node bump-reminder.js
 *
 * At least one of REMINDER_ROLE_ID or REMINDER_USER_IDS should be set, or
 * there's nobody to actually ping when the timer's up.
 *
 * Data persists to bump-reminder.json so the countdown survives a restart.
 */

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const BUMP_CHANNEL_ID = process.env.BUMP_CHANNEL_ID;
const REMINDER_ROLE_ID = process.env.REMINDER_ROLE_ID || null;
const REMINDER_USER_IDS = (process.env.REMINDER_USER_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const COOLDOWN_MINUTES = parseInt(process.env.COOLDOWN_MINUTES || "120", 10);
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;

const DISBOARD_BOT_ID = "302050872383242240"; // DISBOARD's actual application ID

const DATA_FILE = path.join(__dirname, "bump-reminder.json");

if (
  !TOKEN ||
  !GUILD_ID ||
  !BUMP_CHANNEL_ID ||
  (!REMINDER_ROLE_ID && REMINDER_USER_IDS.length === 0)
) {
  console.error(
    "Missing required env vars. Check DISCORD_TOKEN, GUILD_ID, BUMP_CHANNEL_ID, " +
      "and set at least one of REMINDER_ROLE_ID or REMINDER_USER_IDS in your .env file.",
  );
  process.exit(1);
}

// ---------- persistence ----------

function loadState() {
  if (!fs.existsSync(DATA_FILE)) return { readyAt: null };
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { readyAt: null };
  }
}

function saveState(state) {
  const tmpFile = DATA_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
  fs.renameSync(tmpFile, DATA_FILE);
}

let state = loadState();
let reminderTimeout = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function mentionString() {
  const parts = [];
  if (REMINDER_ROLE_ID) parts.push(`<@&${REMINDER_ROLE_ID}>`);
  parts.push(...REMINDER_USER_IDS.map((id) => `<@${id}>`));
  return parts.join(" ");
}

async function sendReminder() {
  try {
    const channel = await client.channels.fetch(BUMP_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.error("BUMP_CHANNEL_ID is not a valid text channel.");
      return;
    }
    await channel.send(
      `⏰ ${mentionString()} It's been ${COOLDOWN_MINUTES} minutes — time to \`/bump\` the server again! 🎀`,
    );
    console.log("Sent bump reminder.");
  } catch (err) {
    console.error("Failed to send bump reminder:", err);
  }

  state.readyAt = null;
  saveState(state);
}

function scheduleReminder(readyAt) {
  if (reminderTimeout) clearTimeout(reminderTimeout);

  const msRemaining = readyAt - Date.now();

  if (msRemaining <= 0) {
    // Cooldown already passed (e.g. bot was offline) — remind right away
    sendReminder();
    return;
  }

  reminderTimeout = setTimeout(sendReminder, msRemaining);
  console.log(
    `Next bump reminder scheduled for ${new Date(readyAt).toLocaleString()} (in ${(msRemaining / 60000).toFixed(1)} min).`,
  );
}

client.once("clientReady", () => {
  console.log(
    `Logged in as ${client.user.tag}! Watching for DISBOARD bump confirmations.`,
  );

  if (state.readyAt) {
    scheduleReminder(state.readyAt);
  } else {
    console.log("No pending reminder — waiting for the next successful /bump.");
  }
});

client.on("messageCreate", (message) => {
  if (!message.guild || message.guild.id !== GUILD_ID) return;
  if (message.channel.id !== BUMP_CHANNEL_ID) return;
  if (message.author.id !== DISBOARD_BOT_ID) return;

  // DISBOARD confirms a successful bump via an embed whose description
  // starts with "Bump done!" — check embeds first, fall back to plain
  // content in case DISBOARD ever changes its message format.
  const embed = message.embeds[0];
  const text = (embed?.description || message.content || "").toLowerCase();

  if (!text.includes("bump done")) return; // not a successful bump (e.g. "please wait" message)

  const readyAt = Date.now() + COOLDOWN_MS;
  state.readyAt = readyAt;
  saveState(state);
  scheduleReminder(readyAt);
  console.log("Bump detected — reminder timer (re)started.");
});

client.login(TOKEN);
