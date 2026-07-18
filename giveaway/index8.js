/**
 * Combined Bot — Giveaway + Invite Tracker + OBS/Canary/Channel Tools
 * -----------------------------------------------------
 * A single process containing all features from the provided scripts.
 */

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
require("dotenv").config();
const { registerServerLogs } = require("./server-logs");

// =====================================================================
// ==================  GIVEAWAY SECTION  ===============================
// =====================================================================

const GIVEAWAY_DATA_FILE = path.join(__dirname, "giveaways.json");
const ENTER_BUTTON_ID = "giveaway_enter";
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const sharp = require("sharp");
const QUOTE_CHANNEL_ID = process.env.QUOTE_CHANNEL_ID;
const CONFESSION_CHANNEL_ID = process.env.CONFESSION_CHANNEL_ID;
const CONFESSION_LOG_CHANNEL_ID = process.env.CONFESSION_LOG_CHANNEL_ID;
const CONFESSION_DATA_FILE = path.join(__dirname, "confessions.json");
function loadConfessionData() {
  if (!fs.existsSync(CONFESSION_DATA_FILE)) return { nextId: 1 };
  try {
    return JSON.parse(fs.readFileSync(CONFESSION_DATA_FILE, "utf8"));
  } catch {
    return { nextId: 1 };
  }
}

function saveConfessionData(data) {
  fs.writeFileSync(CONFESSION_DATA_FILE, JSON.stringify(data, null, 2));
}

let confessionData = loadConfessionData();

// Map<token, { userId, text }> — confessions awaiting DM confirmation.
// In-memory only: if the bot restarts between "send" and "confirm", the
// person just has to re-send .confess — no partial/leaked data either way.
const pendingConfessions = new Map();

function buildConfessionConfirmRow(token) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confess_post_${token}`)
      .setLabel("✅ Post anonymously")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`confess_cancel_${token}`)
      .setLabel("❌ Cancel")
      .setStyle(ButtonStyle.Danger),
  );
}

// sharp/libvips has no text-measurement API, so wrapping uses an estimate
// instead of exact pixel widths. It's close enough for this layout, but
// if lines look consistently too long/short, tweak the 0.55 multiplier.
function estimateTextWidth(text, fontSize) {
  return text.length * fontSize * 0.55;
}

function wrapText(text, maxWidth, fontSize) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (estimateTextWidth(testLine, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 8);
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generateQuoteImage({ avatarURL, authorName, authorTag, text }) {
  const width = 1200;
  const height = 630;
  const avatarSize = height;

  // --- Fetch + grayscale the avatar ---
  const avatarRes = await fetch(avatarURL);
  const avatarBuffer = Buffer.from(await avatarRes.arrayBuffer());

  const avatarProcessed = await sharp(avatarBuffer)
    .resize(avatarSize, avatarSize, { fit: "cover" })
    .grayscale()
    .png()
    .toBuffer();

  // --- Darken overlay + right-edge gradient fade (same order as before) ---
  const overlaySvg = `
    <svg width="${avatarSize}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${avatarSize}" height="${height}" fill="#000000" opacity="0.25"/>
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1a1a1a" stop-opacity="0"/>
          <stop offset="100%" stop-color="#1a1a1a" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <rect x="${avatarSize - 250}" y="0" width="250" height="${height}" fill="url(#fade)"/>
    </svg>`;

  // --- Text block ---
  const maxTextWidth = width - avatarSize - 100;
  const fontSize = 42;
  const lineHeight = 54;
  const lines = wrapText(text, maxTextWidth, fontSize);
  const startY = height / 2 - (lines.length * lineHeight) / 2;

  const lineSpans = lines
    .map(
      (line, i) =>
        `<text x="${avatarSize + 60}" y="${startY + i * lineHeight}" font-family="sans-serif" font-style="italic" font-size="${fontSize}" fill="#f2f2f2">${escapeXml(line)}</text>`,
    )
    .join("\n");

  const textSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${avatarSize + 30}" y="140" font-family="sans-serif" font-weight="bold" font-size="120" fill="#ffffff">&#8220;</text>
      ${lineSpans}
      <text x="${avatarSize + 60}" y="${startY + lines.length * lineHeight + 60}" font-family="sans-serif" font-weight="bold" font-size="32" fill="#ffffff">— ${escapeXml(authorName)}</text>
      <text x="${avatarSize + 60}" y="${startY + lines.length * lineHeight + 95}" font-family="sans-serif" font-size="24" fill="#aaaaaa">@${escapeXml(authorTag)}</text>
    </svg>`;

  return sharp({
    create: { width, height, channels: 4, background: "#1a1a1a" },
  })
    .composite([
      { input: avatarProcessed, left: 0, top: 0 },
      { input: Buffer.from(overlaySvg), left: 0, top: 0 },
      { input: Buffer.from(textSvg), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

function loadGiveaways() {
  if (!fs.existsSync(GIVEAWAY_DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(GIVEAWAY_DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveGiveaways(data) {
  fs.writeFileSync(GIVEAWAY_DATA_FILE, JSON.stringify(data, null, 2));
}

let giveaways = loadGiveaways(); // keyed by messageId

const ALLOWED_ROLE_IDS = (process.env.ALLOWED_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function hasGiveawayPermission(interaction) {
  const member = interaction.member;
  if (!member) return false;

  // Administrators and the server owner always pass
  if (member.permissions?.has?.("Administrator")) return true;
  if (interaction.guild?.ownerId === interaction.user.id) return true;

  if (ALLOWED_USER_IDS.includes(interaction.user.id)) return true;

  if (ALLOWED_ROLE_IDS.length > 0) {
    const roleCache = member.roles?.cache;
    if (roleCache && roleCache.some((r) => ALLOWED_ROLE_IDS.includes(r.id))) {
      return true;
    }
  }

  // If no allow-list is configured at all, fall back to open access
  if (ALLOWED_ROLE_IDS.length === 0 && ALLOWED_USER_IDS.length === 0)
    return true;

  return false;
}

function parseDuration(input) {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(input.trim());
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}

function buildGiveawayEmbed(g) {
  const endTimestamp = Math.floor(g.endsAt / 1000);
  return new EmbedBuilder()
    .setTitle("🎉 Giveaway 🎉")
    .setDescription(
      `**Prize:** ${g.prize}\n` +
        `**Winners:** ${g.winnerCount}\n` +
        `**Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)\n` +
        `**Hosted by:** <@${g.hostId}>\n\n` +
        `Click the button below to enter!`,
    )
    .setColor(g.ended ? 0x808080 : 0x00c853)
    .setFooter({ text: `Entries: ${g.entrants.length}` });
}

function buildEnterRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ENTER_BUTTON_ID)
      .setLabel("🎉 Enter Giveaway")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
  );
}

function pickWinners(entrants, count) {
  const pool = [...entrants];
  const winners = [];
  while (pool.length && winners.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

async function endGiveaway(client, messageId, { reroll = false } = {}) {
  const g = giveaways[messageId];
  if (!g) return { error: "No giveaway found with that message ID." };

  const channel = await client.channels.fetch(g.channelId).catch(() => null);
  if (!channel) return { error: "Could not find the giveaway channel." };

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return { error: "Could not find the giveaway message." };

  if (g.entrants.length === 0) {
    if (!reroll) {
      g.ended = true;
      saveGiveaways(giveaways);
      await message.edit({
        embeds: [buildGiveawayEmbed(g)],
        components: [buildEnterRow(true)],
      });
      await channel.send(
        "🎉 Giveaway ended — nobody entered, so no winner could be picked.",
      );
    }
    return { error: "There are no entrants to pick a winner from." };
  }

  const winners = pickWinners(g.entrants, g.winnerCount);
  g.ended = true;
  g.lastWinners = winners;
  saveGiveaways(giveaways);

  await message.edit({
    embeds: [buildGiveawayEmbed(g)],
    components: [buildEnterRow(true)],
  });

  const winnerMentions = winners.map((id) => `<@${id}>`).join(", ");
  await channel.send(
    `${reroll ? "🔄 **Reroll!**" : "🎉 **Giveaway ended!**"} Congratulations ${winnerMentions} — you won **${g.prize}**!`,
  );

  return { winners };
}

// =====================================================================
// ================  INVITE TRACKER SECTION  ===========================
// =====================================================================

const INVITES_DATA_FILE = path.join(__dirname, "invites.json");
const HISTORY_FILE = path.join(__dirname, "invite-history.jsonl");

// =====================================================================
// ==================  ACTIVITY TRACKER SECTION  =======================
// =====================================================================

const ACTIVITY_DATA_FILE = path.join(__dirname, "activity.json");

function loadActivityData() {
  if (!fs.existsSync(ACTIVITY_DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(ACTIVITY_DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

let activityStore = loadActivityData();
const voiceSessions = new Map(); // Tracks active VC sessions: Map<userId, { channelId, joinTime }>

// Save activity data every minute to avoid blocking your bot on every single message
setInterval(() => {
  const now = Date.now();
  let dataChanged = false;

  // 1. Flush ongoing voice time for EVERY active user into activityStore
  for (const [userId, session] of voiceSessions.entries()) {
    if (session.guildId && session.channelId) {
      recordVoiceTime(
        session.guildId,
        userId,
        session.channelId,
        session.joinTime,
      );
      session.joinTime = now; // Reset the baseline so we don't double count the next increment
      dataChanged = true;
    }
  }

  // 2. Safely commit the state file
  const tmpFile = ACTIVITY_DATA_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(activityStore, null, 2));
  fs.renameSync(tmpFile, ACTIVITY_DATA_FILE);
}, 60000);

function getTodayString() {
  return new Date().toISOString().split("T")[0]; // returns "YYYY-MM-DD"
}

function ensureActivityUser(guildId, userId) {
  if (!activityStore[guildId]) activityStore[guildId] = {};
  if (!activityStore[guildId][userId]) {
    activityStore[guildId][userId] = { voice: {}, text: {} };
  }
  return activityStore[guildId][userId];
}

function recordVoiceTime(guildId, userId, channelId, joinTime) {
  const durationMs = Date.now() - joinTime;
  if (durationMs < 1000) return; // ignore sub-second jitter

  const userStats = ensureActivityUser(guildId, userId);
  if (!userStats.voice[channelId]) userStats.voice[channelId] = {};

  const today = getTodayString();
  userStats.voice[channelId][today] =
    (userStats.voice[channelId][today] || 0) + durationMs;
}

function formatDuration(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

function logEvent(entry) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  });
  try {
    fs.appendFileSync(HISTORY_FILE, line + "\n");
  } catch (err) {
    console.error("Failed to write to invite-history.jsonl:", err);
  }
}

function readHistory({ guildId, userId, limit = 10 } = {}) {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  const lines = fs
    .readFileSync(HISTORY_FILE, "utf8")
    .split("\n")
    .filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed lines rather than crash
    }
  }
  return entries
    .filter((e) => !guildId || e.guildId === guildId)
    .filter(
      (e) =>
        !userId ||
        e.userId === userId ||
        e.inviterId === userId ||
        e.targetUserId === userId ||
        e.actorId === userId,
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

function loadInvitesData() {
  if (!fs.existsSync(INVITES_DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(INVITES_DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveInvitesData(data) {
  const tmpFile = INVITES_DATA_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, INVITES_DATA_FILE);
}

let store = loadInvitesData();

function ensureGuild(guildId) {
  if (!store[guildId]) store[guildId] = { users: {}, joins: {} };
  if (!store[guildId].users) store[guildId].users = {};
  if (!store[guildId].joins) store[guildId].joins = {};
  return store[guildId];
}

function ensureUser(guildId, userId) {
  const g = ensureGuild(guildId);
  if (!g.users[userId]) g.users[userId] = { regular: 0, leaves: 0 };
  return g.users[userId];
}

function totalInvites(stats) {
  return Math.max(0, (stats?.regular || 0) - (stats?.leaves || 0));
}

const ADMIN_ROLE_IDS = (process.env.INVITE_ADMIN_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ADMIN_USER_IDS = (process.env.INVITE_ADMIN_USER_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const NICKNAME_MANAGER_ROLE_IDS = (process.env.NICKNAME_MANAGER_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const NICKNAME_SUPER_ROLE_ID = process.env.NICKNAME_SUPER_ROLE_ID || null;

function canChangeNickname(interaction, targetMember) {
  const member = interaction.member;
  if (!member) return false;

  // Server owner and Administrators can always rename anyone (except the owner themself, see Discord's own limit below)
  if (interaction.guild.ownerId === interaction.user.id) return true;
  if (member.permissions?.has?.("Administrator")) return true;

  const roleCache = member.roles?.cache;
  if (!roleCache) return false;

  // Super role — bypasses hierarchy, can target anyone
  if (NICKNAME_SUPER_ROLE_ID && roleCache.has(NICKNAME_SUPER_ROLE_ID)) {
    return true;
  }

  // Manager roles — can only rename members whose highest role sits BELOW the invoker's highest role
  const isManager = NICKNAME_MANAGER_ROLE_IDS.some((id) => roleCache.has(id));
  if (isManager) {
    const invokerTop = member.roles.highest.position;
    const targetTop = targetMember.roles.highest.position;
    return invokerTop > targetTop;
  }

  return false;
}

function hasAdminPermission(interaction) {
  const member = interaction.member;
  if (!member) return false;

  if (member.permissions?.has?.("Administrator")) return true;
  if (member.permissions?.has?.("ManageGuild")) return true;
  if (interaction.guild?.ownerId === interaction.user.id) return true;
  if (ADMIN_USER_IDS.includes(interaction.user.id)) return true;

  const roleCache = member.roles?.cache;
  if (ADMIN_ROLE_IDS.length > 0 && roleCache) {
    if (roleCache.some((r) => ADMIN_ROLE_IDS.includes(r.id))) return true;
  }

  return false;
}

// Map<guildId, Map<code, { uses, maxUses, inviterId }>>
const inviteCache = new Map();
// Map<guildId, number> — vanity URL use count
const vanityCache = new Map();

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    for (const inv of invites.values()) {
      map.set(inv.code, {
        uses: inv.uses ?? 0,
        maxUses: inv.maxUses ?? 0,
        inviterId: inv.inviter?.id ?? null,
      });
    }
    inviteCache.set(guild.id, map);
  } catch (err) {
    console.warn(
      `Could not fetch invites for "${guild.name}" — make sure the bot has Manage Server permission.`,
    );
  }

  // Correctly handle Vanity URL initial cache
  if (guild.features?.includes("VANITY_URL")) {
    try {
      const vanity = await guild.fetchVanityData();
      vanityCache.set(guild.id, vanity.uses ?? 0);
    } catch (err) {
      console.error(`Failed to fetch vanity data for ${guild.name}:`, err);
    }
  }
}
async function resolveUsedInvite(guild) {
  const oldMap = inviteCache.get(guild.id) || new Map();
  let newMap = new Map();
  try {
    const invites = await guild.invites.fetch();
    for (const inv of invites.values()) {
      newMap.set(inv.code, {
        uses: inv.uses ?? 0,
        maxUses: inv.maxUses ?? 0,
        inviterId: inv.inviter?.id ?? null,
      });
    }
  } catch {
    return { inviterId: null, code: null };
  }

  // Case 1: an existing invite's use count went up
  for (const [code, info] of newMap) {
    const old = oldMap.get(code);
    if (old && info.uses > old.uses) {
      inviteCache.set(guild.id, newMap);
      return { inviterId: info.inviterId, code };
    }
  }

  // Case 2: a single-use invite was used and Discord auto-deleted it
  for (const [code, old] of oldMap) {
    if (!newMap.has(code) && old.maxUses > 0 && old.uses + 1 === old.maxUses) {
      inviteCache.set(guild.id, newMap);
      return { inviterId: old.inviterId, code };
    }
  }

  // Case 3: vanity URL invite
  if (guild.features?.includes("VANITY_URL")) {
    try {
      const vanity = await guild.fetchVanityData();
      const oldUses = vanityCache.get(guild.id) ?? 0;
      if ((vanity.uses ?? 0) > oldUses) {
        vanityCache.set(guild.id, vanity.uses ?? 0);
        inviteCache.set(guild.id, newMap);
        return { inviterId: null, code: "VANITY" };
      }
    } catch {
      // ignore
    }
  }

  inviteCache.set(guild.id, newMap);
  return { inviterId: null, code: null };
}

// =====================================================================
// =================  OBS & UTILS SECTION  =============================
// =====================================================================

const obs = new OBSWebSocket();

async function connectOBS() {
  try {
    await obs.connect(
      `wss://${process.env.OBS_HOST}:${process.env.OBS_PORT}`,
      process.env.OBS_PASSWORD,
    );
    console.log("Connected to OBS");
  } catch (err) {
    console.error("ACTUAL OBS ERROR:", err.message);
  }
}
obs.on("ConnectionClosed", () => {
  console.warn(
    "⚠️ OBS connection lost. Attempting to reconnect in 5 seconds...",
  );
  setTimeout(connectOBS, 5000);
});

obs.on("ConnectionError", (err) => {
  console.error("🚨 OBS Connection Error:", err.message);
});
// Fold stylized unicode down to plain ASCII where possible
function normalize(str) {
  return str
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "");
}

// Cache the last "list channels" result per-user so "pick N" knows what N refers to
const lastListCache = new Map(); // userId -> array of channels in listed order

// =====================================================================
// ==============  COMBINED SLASH COMMAND DEFINITIONS  =================
// =====================================================================

const commands = [
  new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Check voice and text activity stats")
    // REQUIRED OPTION FIRST
    .addStringOption((opt) =>
      opt
        .setName("timeframe")
        .setDescription("Timeframe to check")
        .setRequired(true)
        .addChoices(
          { name: "7 Days", value: "7" },
          { name: "14 Days", value: "14" },
          { name: "30 Days", value: "30" },
          { name: "Lifetime", value: "all" },
        ),
    )
    // OPTIONAL OPTION SECOND
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User to check (defaults to you)")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("confess")
    .setDescription("Submit an anonymous confession"),
  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Manage giveaways")
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Start a new giveaway")
        .addStringOption((opt) =>
          opt
            .setName("prize")
            .setDescription("What are you giving away?")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("winners")
            .setDescription("Number of winners")
            .setRequired(true)
            .setMinValue(1),
        )
        .addStringOption((opt) =>
          opt
            .setName("duration")
            .setDescription("How long it runs, e.g. 30s, 10m, 1h, 2d")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("End a giveaway early")
        .addStringOption((opt) =>
          opt
            .setName("message_id")
            .setDescription("The giveaway message ID")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reroll")
        .setDescription("Reroll winners for a giveaway")
        .addStringOption((opt) =>
          opt
            .setName("message_id")
            .setDescription("The giveaway message ID")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List active giveaways"),
    ),
  new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restart the bot (admin/owner only)"),
  new SlashCommandBuilder()
    .setName("nickname")
    .setDescription("Manage member nicknames")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Change a member's nickname")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("Member to rename")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("name").setDescription("New nickname").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription("Reset a member's nickname back to their username")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("Member to reset")
            .setRequired(true),
        ),
    ),

  new SlashCommandBuilder()
    .setName("invites")
    .setDescription("Invite tracking")
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View a member's invite stats")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("Member to check (defaults to you)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("leaderboard").setDescription("Top inviters in this server"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription("Reset a member's invite stats (admin/owner only)")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("Member to reset")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset-all")
        .setDescription(
          "Reset EVERY member's invite stats in this server (admin/owner only)",
        )
        .addBooleanOption((opt) =>
          opt
            .setName("confirm")
            .setDescription(
              "Set to true to confirm — this cannot be undone from Discord",
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("log")
        .setDescription("View recent invite/reset history (admin/owner only)")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("Filter by member (optional)")
            .setRequired(false),
        ),
    ),
].map((c) => c.toJSON());

// =====================================================================
// ==========================  CLIENT  =================================
// =====================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
  ],
});

registerServerLogs(client);

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // --- Start OBS connection ---
  connectOBS().catch((err) => {
    console.error("OBS startup error:", err);
  });

  // --- giveaway startup logging ---
  if (ALLOWED_ROLE_IDS.length === 0 && ALLOWED_USER_IDS.length === 0) {
    console.warn(
      "WARNING: ALLOWED_ROLE_IDS and ALLOWED_USER_IDS are both empty in .env — " +
        "anyone in the server can use /giveaway commands (admins/owner always can regardless).",
    );
  } else {
    console.log(
      `Giveaway command access restricted to roles [${ALLOWED_ROLE_IDS.join(", ") || "none"}] ` +
        `and users [${ALLOWED_USER_IDS.join(", ") || "none"}] (plus admins/owner).`,
    );
  }

  // --- invite tracker startup logging ---
  console.log(`Data file:    ${INVITES_DATA_FILE}`);
  console.log(`History file: ${HISTORY_FILE}`);

  const guildCount = Object.keys(store).length;
  const userCount = Object.values(store).reduce(
    (sum, g) => sum + Object.keys(g.users || {}).length,
    0,
  );
  console.log(
    `Loaded existing data for ${guildCount} guild(s), ${userCount} tracked user(s). `,
  );

  // --- one combined command registration ---
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(
          process.env.CLIENT_ID,
          process.env.GUILD_ID,
        ),
        { body: commands },
      );
      console.log("Registered guild commands (instant).");
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: commands,
      });
      console.log(
        "Registered global commands (may take up to 1hr to propagate).",
      );
    }
  } catch (err) {
    console.error("Failed to register commands:", err);
  }

  // --- giveaway: re-arm timers for any giveaways still active after a restart ---
  const activeGiveaways = Object.entries(giveaways).filter(([, g]) => !g.ended);

  if (activeGiveaways.length === 0) {
    console.log("No active giveaways to resume.");
  } else {
    console.log(`Resuming ${activeGiveaways.length} active giveaway(s)...`);
    for (const [messageId, g] of activeGiveaways) {
      const msRemaining = g.endsAt - Date.now();
      if (msRemaining <= 0) {
        endGiveaway(client, messageId).catch(console.error);
      } else {
        setTimeout(
          () => endGiveaway(client, messageId).catch(console.error),
          msRemaining,
        );
      }
    }
  }

  // --- invite tracker: cache invites for every guild the bot is in ---
  for (const guild of client.guilds.cache.values()) {
    await updateServerStats(guild);

    setInterval(
      () => {
        updateServerStats(guild);
      },
      5 * 60 * 1000,
    );
  }

  // --- Activity Tracker: Catch existing users in VC on bot start ---
  for (const guild of client.guilds.cache.values()) {
    try {
      const fullGuild = await guild.fetch();
      for (const member of fullGuild.members.cache.values()) {
        if (member.voice.channelId && !member.user.bot) {
          voiceSessions.set(member.id, {
            guildId: guild.id, // <-- CRITICAL FIX: Explicitly binds the active tracking context
            channelId: member.voice.channelId,
            joinTime: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error(
        `Failed live synchronization scan for guild ${guild.id}:`,
        err,
      );
    }
  }
});
async function updateServerStats(guild) {
  await guild.members.fetch();

  const members = guild.members.cache;

  const total = members.size;
  const humans = members.filter((m) => !m.user.bot).size;
  const bots = members.filter((m) => m.user.bot).size;

  const bciRole = guild.roles.cache.get(process.env.BCI_ROLE_ID);
  const bciMembers = bciRole ? bciRole.members.size : 0;

  const online = members.filter(
    (m) => m.presence && m.presence.status !== "offline",
  ).size;

  const voice = members.filter((m) => m.voice.channel).size;

  const boosts = guild.premiumSubscriptionCount;

  const rename = async (id, text) => {
    if (!id) return;

    const channel = guild.channels.cache.get(id);
    if (channel) await channel.setName(text).catch(console.error);
  };

  await rename(
    process.env.TOTAL_MEMBERS_CHANNEL,
    `👥 Total Members : ${total}`,
  );
  await rename(process.env.HUMANS_CHANNEL, `🧑 Humans : ${humans}`);
  await rename(process.env.BOTS_CHANNEL, `🤖 Bots : ${bots}`);
  await rename(process.env.BCI_CHANNEL, `💖 BCI Members : ${bciMembers}`);
  await rename(process.env.ONLINE_CHANNEL, `🟢 Online : ${online}`);
  await rename(process.env.VOICE_CHANNEL, `🎙️ In VC : ${voice}`);
  await rename(process.env.BOOST_CHANNEL, `🚀 Boosts : ${boosts}`);
}
// --- Activity Tracker: Catch existing users in VC on bot start ---
client.once("clientReady", () => {
  for (const guild of client.guilds.cache.values()) {
    for (const member of guild.members.cache.values()) {
      if (member.voice.channelId && !member.user.bot) {
        voiceSessions.set(member.id, {
          channelId: member.voice.channelId,
          joinTime: Date.now(),
        });
      }
    }
  }
});

// --- Activity Tracker: Voice State Updates ---
client.on("voiceStateUpdate", (oldState, newState) => {
  if (newState.member?.user.bot) return;
  const userId = newState.member.id;
  const guildId = newState.guild.id;

  // Case 1: Joined a VC
  if (!oldState.channelId && newState.channelId) {
    voiceSessions.set(userId, {
      guildId,
      channelId: newState.channelId,
      joinTime: Date.now(),
    });
  }
  // Case 2: Left a VC completely
  else if (oldState.channelId && !newState.channelId) {
    const session = voiceSessions.get(userId);
    if (session) {
      recordVoiceTime(guildId, userId, session.channelId, session.joinTime);
      voiceSessions.delete(userId);
    }
  }
  // Case 3: Switched internal VCs
  else if (
    oldState.channelId &&
    newState.channelId &&
    oldState.channelId !== newState.channelId
  ) {
    const session = voiceSessions.get(userId);
    if (session) {
      recordVoiceTime(guildId, userId, session.channelId, session.joinTime);
    }
    voiceSessions.set(userId, {
      guildId,
      channelId: newState.channelId,
      joinTime: Date.now(),
    });
  }
});

// --- Activity Tracker: Text Messages ---
client.on("messageCreate", (message) => {
  if (message.author.bot || !message.guild) return;

  const userStats = ensureActivityUser(message.guild.id, message.author.id);
  const channelId = message.channel.id;
  const today = getTodayString();

  if (!userStats.text[channelId]) userStats.text[channelId] = {};
  userStats.text[channelId][today] =
    (userStats.text[channelId][today] || 0) + 1;
});
// --- Invite Tracker Event Listeners ---

client.on("guildCreate", (guild) => cacheGuildInvites(guild));

client.on("inviteCreate", async (invite) => {
  const map = inviteCache.get(invite.guild.id) || new Map();
  map.set(invite.code, {
    uses: invite.uses ?? 0,
    maxUses: invite.maxUses ?? 0,
    inviterId: invite.inviter?.id ?? null,
  });
  inviteCache.set(invite.guild.id, map);
});

client.on("inviteDelete", (invite) => {
  const map = inviteCache.get(invite.guild.id);
  if (map) map.delete(invite.code);
});

client.on("guildMemberAdd", async (member) => {
  if (member.user.bot) return;

  const { inviterId, code } = await resolveUsedInvite(member.guild);

  if (!inviterId) {
    return;
  }
  if (inviterId === member.id) return;

  const g = ensureGuild(member.guild.id);
  const stats = ensureUser(member.guild.id, inviterId);
  stats.regular += 1;
  g.joins[member.id] = { inviterId, code };
  saveInvitesData(store);
  logEvent({
    type: "join",
    guildId: member.guild.id,
    userId: member.id,
    inviterId,
    code,
  });
  await updateServerStats(member.guild);
});

client.on("guildMemberRemove", (member) => {
  const g = ensureGuild(member.guild.id);
  const record = g.joins[member.id];
  if (!record) return;

  const stats = ensureUser(member.guild.id, record.inviterId);
  stats.leaves += 1;
  delete g.joins[member.id];
  saveInvitesData(store);
  logEvent({
    type: "leave",
    guildId: member.guild.id,
    userId: member.id,
    inviterId: record.inviterId,
  });

  updateServerStats(member.guild);
});
client.on("guildMemberUpdate", (oldMember, newMember) => {
  const roleId = process.env.BCI_ROLE_ID;

  const hadRole = oldMember.roles.cache.has(roleId);
  const hasRole = newMember.roles.cache.has(roleId);

  if (hadRole !== hasRole) {
    updateServerStats(newMember.guild);
  }
});

// =====================================================================
// =====================  INTERACTION HANDLER  =========================
// =====================================================================

client.on("interactionCreate", async (interaction) => {
  try {
    // --- /activity ---
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "activity"
    ) {
      const targetUser =
        interaction.options.getUser("user") || interaction.user;
      const timeframe = interaction.options.getString("timeframe", true);
      const guildId = interaction.guildId;

      // Ensure active VC time is accounted for right now
      const currentSession = voiceSessions.get(targetUser.id);
      if (currentSession) {
        recordVoiceTime(
          guildId,
          targetUser.id,
          currentSession.channelId,
          currentSession.joinTime,
        );
        voiceSessions.set(targetUser.id, {
          channelId: currentSession.channelId,
          joinTime: Date.now(),
        }); // reset timer
      }

      const stats = activityStore[guildId]?.[targetUser.id] || {
        voice: {},
        text: {},
      };

      let cutoffMs = 0;
      if (timeframe !== "all") {
        const days = parseInt(timeframe, 10);
        cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
      }

      let totalVoiceMs = 0;
      let totalMessages = 0;
      const voiceByChannel = {};
      const textByChannel = {};

      // Aggregate Voice
      for (const [channelId, dates] of Object.entries(stats.voice || {})) {
        for (const [dateStr, ms] of Object.entries(dates)) {
          if (new Date(dateStr).getTime() >= cutoffMs) {
            totalVoiceMs += ms;
            voiceByChannel[channelId] = (voiceByChannel[channelId] || 0) + ms;
          }
        }
      }

      // Aggregate Text
      for (const [channelId, dates] of Object.entries(stats.text || {})) {
        for (const [dateStr, count] of Object.entries(dates)) {
          if (new Date(dateStr).getTime() >= cutoffMs) {
            totalMessages += count;
            textByChannel[channelId] = (textByChannel[channelId] || 0) + count;
          }
        }
      }

      // Find top 3 channels for each
      const topVoice =
        Object.entries(voiceByChannel)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id, ms]) => `<#${id}>: ${formatDuration(ms)}`)
          .join("\n") || "No voice activity";

      const topText =
        Object.entries(textByChannel)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id, count]) => `<#${id}>: ${count} msgs`)
          .join("\n") || "No text activity";

      const timeLabel =
        timeframe === "all" ? "Lifetime" : `Past ${timeframe} Days`;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📊 Activity Stats — ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription(`Showing data for **${timeLabel}**`)
        .addFields(
          {
            name: "🎙️ Total Voice Time",
            value: formatDuration(totalVoiceMs),
            inline: true,
          },
          {
            name: "💬 Total Messages",
            value: `${totalMessages}`,
            inline: true,
          },
          { name: "\u200B", value: "\u200B" }, // Spacer
          { name: "🏆 Top Voice Channels", value: topVoice, inline: true },
          { name: "🏆 Top Text Channels", value: topText, inline: true },
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
    // --- /confess ---
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "confess"
    ) {
      const modal = new ModalBuilder()
        .setCustomId("confession_modal")
        .setTitle("Anonymous Confession");

      const textInput = new TextInputBuilder()
        .setCustomId("confession_text")
        .setLabel("What's your confession?")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(textInput));
      return interaction.showModal(modal);
    }

    // --- confession modal submit ---
    if (
      interaction.isModalSubmit() &&
      interaction.customId === "confession_modal"
    ) {
      const confessionText =
        interaction.fields.getTextInputValue("confession_text");

      if (!CONFESSION_CHANNEL_ID) {
        return interaction.reply({
          content:
            "❌ Confessions aren't set up yet — ask an admin to configure CONFESSION_CHANNEL_ID.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const token = `${interaction.user.id}_${Date.now()}`;
      pendingConfessions.set(token, {
        userId: interaction.user.id,
        text: confessionText,
      });

      const previewEmbed = new EmbedBuilder()
        .setTitle("📝 Confession Preview")
        .setDescription(confessionText)
        .setColor(0x9b59b6)
        .setFooter({
          text: "Posted completely anonymously — your identity is never shown or logged in the message.",
        });

      return interaction.reply({
        content: "Post this confession anonymously in the server?",
        embeds: [previewEmbed],
        components: [buildConfessionConfirmRow(token)],
        flags: MessageFlags.Ephemeral,
      });
    }
    // --- /restart ---
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "restart"
    ) {
      if (!hasGiveawayPermission(interaction)) {
        return interaction.reply({
          content: "🚫 You do not have permission to restart this bot.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.reply({
        content: "🔄 Restarting... back in a few seconds.",
        flags: MessageFlags.Ephemeral,
      });

      setTimeout(() => process.exit(0), 1000);
      return;
    }
    // --- /nickname ---
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "nickname"
    ) {
      // 1. THIS MUST BE THE FIRST AWAIT
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // 2. Fetching members and variables happens AFTER the defer
      const sub = interaction.options.getSubcommand();
      const targetUser = interaction.options.getUser("user", true);
      const targetMember = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);
      // If the command is 'set', grab the name. If it's 'reset', pass null to clear it.
      const newName =
        sub === "set" ? interaction.options.getString("name", true) : null;

      if (!targetMember) {
        return interaction.editReply({
          content: "❌ Could not find that member in this server.",
        });
      }

      if (!canChangeNickname(interaction, targetMember)) {
        return interaction.editReply({
          content:
            "🚫 You don't have permission to change that member's nickname. Managers can only rename members below their own highest role.",
        });
      }

      if (targetMember.id === interaction.guild.ownerId) {
        return interaction.editReply({
          content:
            "⚠️ Discord does not allow bots to change the server owner's own nickname — this has to be done manually by the owner.",
        });
      }

      try {
        await targetMember.setNickname(
          newName,
          `Nickname ${sub === "set" ? "changed" : "reset"} by ${interaction.user.tag} via /nickname`,
        );

        return interaction.editReply({
          content: newName
            ? `✅ Changed **${targetUser.username}**'s nickname to **${newName}**.`
            : `✅ Reset **${targetUser.username}**'s nickname.`,
        });
      } catch (err) {
        console.error("Nickname change error:", err);
        return interaction.editReply({
          content:
            "❌ Failed to change that nickname. This usually means the bot's own role is below the target member's highest role — move the bot's role higher in Server Settings → Roles.",
        });
      }
    }
    // --- /giveaway ---
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "giveaway"
    ) {
      const sub = interaction.options.getSubcommand();

      if (!hasGiveawayPermission(interaction)) {
        return interaction.reply({
          content: "🚫 You do not have permission to control this bot.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (sub === "start") {
        const prize = interaction.options.getString("prize", true);
        const winnerCount = interaction.options.getInteger("winners", true);
        const durationInput = interaction.options.getString("duration", true);
        const durationMs = parseDuration(durationInput);

        if (!durationMs) {
          return interaction.reply({
            content:
              "Invalid duration format. Use something like `30s`, `10m`, `1h`, or `2d`.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const endsAt = Date.now() + durationMs;
        const placeholderEmbed = new EmbedBuilder()
          .setTitle("🎉 Giveaway 🎉")
          .setDescription("Starting...")
          .setColor(0x00c853);

        await interaction.reply({
          content: "Starting giveaway...",
          flags: MessageFlags.Ephemeral,
        });
        const message = await interaction.channel.send({
          embeds: [placeholderEmbed],
          components: [buildEnterRow(false)],
        });

        const g = {
          messageId: message.id,
          channelId: message.channel.id,
          guildId: interaction.guildId,
          hostId: interaction.user.id,
          prize,
          winnerCount,
          endsAt,
          entrants: [],
          ended: false,
        };
        giveaways[message.id] = g;
        saveGiveaways(giveaways);

        await message.edit({
          embeds: [buildGiveawayEmbed(g)],
          components: [buildEnterRow(false)],
        });

        setTimeout(
          () => endGiveaway(client, message.id).catch(console.error),
          durationMs,
        );

        await interaction.editReply(
          `Giveaway started! Message ID: \`${message.id}\``,
        );
      }

      if (sub === "end") {
        const messageId = interaction.options.getString("message_id", true);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const result = await endGiveaway(client, messageId);
        if (result.error) return interaction.editReply(result.error);
        return interaction.editReply("Giveaway ended.");
      }

      if (sub === "reroll") {
        const messageId = interaction.options.getString("message_id", true);
        const g = giveaways[messageId];
        if (!g || !g.ended) {
          return interaction.reply({
            content:
              "That giveaway has not ended yet (or does not exist), so it cannot be rerolled.",
            flags: MessageFlags.Ephemeral,
          });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const result = await endGiveaway(client, messageId, { reroll: true });
        if (result.error) return interaction.editReply(result.error);
        return interaction.editReply("Giveaway rerolled.");
      }

      if (sub === "list") {
        const active = Object.values(giveaways).filter(
          (g) => !g.ended && g.guildId === interaction.guildId,
        );
        if (active.length === 0) {
          return interaction.reply({
            content: "No active giveaways.",
            flags: MessageFlags.Ephemeral,
          });
        }
        const lines = active.map(
          (g) =>
            `• **${g.prize}** — ID \`${g.messageId}\` — ends <t:${Math.floor(
              g.endsAt / 1000,
            )}:R> — ${g.entrants.length} entrant(s)`,
        );
        return interaction.reply({
          content: lines.join("\n"),
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    // --- giveaway enter/leave button ---
    if (interaction.isButton() && interaction.customId === ENTER_BUTTON_ID) {
      const g = giveaways[interaction.message.id];
      if (!g || g.ended) {
        return interaction.reply({
          content: "This giveaway has ended.",
          flags: MessageFlags.Ephemeral,
        });
      }
      if (g.entrants.includes(interaction.user.id)) {
        g.entrants = g.entrants.filter((id) => id !== interaction.user.id);
        saveGiveaways(giveaways);
        await interaction.reply({
          content: "You left the giveaway.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        g.entrants.push(interaction.user.id);
        saveGiveaways(giveaways);
        await interaction.reply({
          content: "You entered the giveaway! Good luck 🍀",
          flags: MessageFlags.Ephemeral,
        });
      }

      const channel = await client.channels.fetch(g.channelId);
      const message = await channel.messages.fetch(g.messageId);
      await message.edit({
        embeds: [buildGiveawayEmbed(g)],
        components: [buildEnterRow(false)],
      });
      return;
    }

    // --- confession confirm/cancel buttons ---
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("confess_post_")
    ) {
      const token = interaction.customId.replace("confess_post_", "");
      const pending = pendingConfessions.get(token);

      if (!pending) {
        return interaction.reply({
          content:
            "⚠️ This confession expired or was already handled. DM `.confess` again to start a new one.",
          flags: MessageFlags.Ephemeral,
        });
      }
      if (interaction.user.id !== pending.userId) {
        return interaction.reply({
          content:
            "🚫 Only the person who wrote this confession can confirm it.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const channel =
        client.channels.cache.get(CONFESSION_CHANNEL_ID) ||
        (await client.channels.fetch(CONFESSION_CHANNEL_ID).catch(() => null));

      if (!channel) {
        pendingConfessions.delete(token);
        return interaction.update({
          content:
            "❌ Could not find the confessions channel — contact an admin.",
          embeds: [],
          components: [],
        });
      }

      const confessionNumber = confessionData.nextId++;
      saveConfessionData(confessionData);

      const confessionEmbed = new EmbedBuilder()
        .setTitle(`🤫 Anonymous Confession #${confessionNumber}`)
        .setDescription(pending.text)
        .setColor(0x9b59b6)
        .setTimestamp();

      // Post anonymous confession
      await channel.send({ embeds: [confessionEmbed] });

      // Send private confession log
      if (CONFESSION_LOG_CHANNEL_ID) {
        const logChannel =
          client.channels.cache.get(CONFESSION_LOG_CHANNEL_ID) ||
          (await client.channels
            .fetch(CONFESSION_LOG_CHANNEL_ID)
            .catch(() => null));

        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle(`🔒 Confession Log #${confessionNumber}`)
            .addFields(
              {
                name: "User",
                value: `${interaction.user.tag} (<@${interaction.user.id}>)`,
              },
              {
                name: "User ID",
                value: interaction.user.id,
              },
              {
                name: "Confession",
                value: pending.text,
              },
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setColor(0xffa500)
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        } else {
          console.error(
            `Confession log channel not found: ${CONFESSION_LOG_CHANNEL_ID}`,
          );
        }
      }

      pendingConfessions.delete(token);

      return interaction.update({
        content: `✅ Your confession was posted anonymously as **#${confessionNumber}**.`,
        embeds: [],
        components: [],
      });
    }

    if (
      interaction.isButton() &&
      interaction.customId.startsWith("confess_cancel_")
    ) {
      const token = interaction.customId.replace("confess_cancel_", "");
      const pending = pendingConfessions.get(token);

      if (pending && interaction.user.id !== pending.userId) {
        return interaction.reply({
          content:
            "🚫 Only the person who wrote this confession can cancel it.",
          flags: MessageFlags.Ephemeral,
        });
      }

      pendingConfessions.delete(token);

      return interaction.update({
        content: "❌ Confession cancelled — nothing was posted.",
        embeds: [],
        components: [],
      });
    }

    // --- /invites ---
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "invites"
    ) {
      const sub = interaction.options.getSubcommand();

      if (sub === "view") {
        const target = interaction.options.getUser("user") || interaction.user;
        const stats = ensureUser(interaction.guildId, target.id);
        saveInvitesData(store);

        const embed = new EmbedBuilder()
          .setTitle(`📨 Invite Stats — ${target.username}`)
          .setThumbnail(target.displayAvatarURL())
          .addFields(
            { name: "Total", value: `${totalInvites(stats)}`, inline: true },
            { name: "Joins", value: `${stats.regular}`, inline: true },
            { name: "Left", value: `${stats.leaves}`, inline: true },
          )
          .setColor(0x5865f2);

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === "leaderboard") {
        const g = ensureGuild(interaction.guildId);
        const entries = Object.entries(g.users)
          .map(([userId, stats]) => ({ userId, total: totalInvites(stats) }))
          .filter((e) => e.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        if (entries.length === 0) {
          return interaction.reply({
            content: "No invites have been tracked yet.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const lines = entries.map(
          (e, i) => `**${i + 1}.** <@${e.userId}> — ${e.total} invite(s)`,
        );
        const embed = new EmbedBuilder()
          .setTitle("🏆 Invite Leaderboard")
          .setDescription(lines.join("\n"))
          .setColor(0xffd700);

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === "reset") {
        if (!hasAdminPermission(interaction)) {
          return interaction.reply({
            content: "🚫 You do not have permission to reset invites.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const target = interaction.options.getUser("user", true);
        const g = ensureGuild(interaction.guildId);
        const previousStats = { ...ensureUser(interaction.guildId, target.id) };
        g.users[target.id] = { regular: 0, leaves: 0 };
        saveInvitesData(store);
        logEvent({
          type: "reset",
          guildId: interaction.guildId,
          targetUserId: target.id,
          actorId: interaction.user.id,
          previousStats,
        });

        return interaction.reply({
          content: `Reset invite stats for **${target.username}**.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (sub === "reset-all") {
        if (!hasAdminPermission(interaction)) {
          return interaction.reply({
            content: "🚫 You do not have permission to reset invites.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const confirmed = interaction.options.getBoolean("confirm", true);
        if (!confirmed) {
          return interaction.reply({
            content:
              "Cancelled — set `confirm` to true if you really want to reset every member's invites.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const g = ensureGuild(interaction.guildId);
        const previousUsers = JSON.parse(JSON.stringify(g.users));
        const memberCount = Object.keys(previousUsers).length;

        g.users = {};
        g.joins = {};
        saveInvitesData(store);
        logEvent({
          type: "reset-all",
          guildId: interaction.guildId,
          actorId: interaction.user.id,
          affectedCount: memberCount,
          previousUsers,
        });

        return interaction.reply({
          content: `Reset invite stats for **all ${memberCount} tracked member(s)** in this server.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (sub === "log") {
        if (!hasAdminPermission(interaction)) {
          return interaction.reply({
            content: "🚫 You do not have permission to view the invite log.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const target = interaction.options.getUser("user");
        const entries = readHistory({
          guildId: interaction.guildId,
          userId: target?.id,
          limit: 10,
        });

        if (entries.length === 0) {
          return interaction.reply({
            content:
              "No history recorded yet" +
              (target ? ` for ${target.username}.` : "."),
            flags: MessageFlags.Ephemeral,
          });
        }

        const lines = entries.map((e) => {
          const ts = `<t:${Math.floor(new Date(e.timestamp).getTime() / 1000)}:R>`;
          if (e.type === "join")
            return `${ts} — <@${e.userId}> joined, credited to <@${e.inviterId}>`;
          if (e.type === "leave")
            return `${ts} — <@${e.userId}> left, debited from <@${e.inviterId}>`;
          if (e.type === "reset")
            return `${ts} — <@${e.actorId}> reset <@${e.targetUserId}> (was ${totalInvites(e.previousStats)} invites)`;
          if (e.type === "reset-all")
            return `${ts} — <@${e.actorId}> reset ALL invites (${e.affectedCount} member(s) affected)`;
          return `${ts} — unknown event`;
        });

        return interaction.reply({
          content: lines.join("\n"),
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (interaction.isRepliable()) {
      const payload = {
        content: "Something went wrong handling that.",
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.deferred || interaction.replied) {
        interaction.editReply(payload).catch(() => {});
      } else {
        interaction.reply(payload).catch(() => {});
      }
    }
  }
});

// =====================================================================
// ===================  MESSAGE HANDLER (OBS/Canary) ===================
// =====================================================================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  // ==========================================================
  // PREFIX COMMAND: diva @user
  // ==========================================================
  // ==========================================================
  // PREFIX COMMAND WITH TIMEFRAME: diva @user [days]
  // ==========================================================
  const args = message.content.trim().split(/ +/);
  // ==========================================================
  // LEADERBOARD COMMAND: diva top [days]
  // ==========================================================
  // ==========================================================
  // LEADERBOARD COMMAND: d?top [days]
  // ==========================================================
  if (args[0].toLowerCase() === "s?top") {
    const guildId = message.guildId;

    // Parse timeframe from args (e.g., "d?top 7")
    let timeframeDays = null;
    let cutoffMs = 0;

    // Changed to slice(1) because the number is now the 2nd argument!
    for (const arg of args.slice(1)) {
      if (/^\d+$/.test(arg)) {
        timeframeDays = parseInt(arg, 10);
        cutoffMs = Date.now() - timeframeDays * 24 * 60 * 60 * 1000;
        break;
      }
    }

    // Flush active voice sessions for EVERYONE in this server so the leaderboard is 100% accurate up to the second
    for (const [activeUserId, session] of voiceSessions.entries()) {
      const channel = message.guild.channels.cache.get(session.channelId);
      if (channel) {
        recordVoiceTime(
          guildId,
          activeUserId,
          session.channelId,
          session.joinTime,
        );
        // Reset timer so it doesn't double-count later
        session.joinTime = Date.now();
      }
    }

    const guildStats = activityStore[guildId] || {};
    const userTotals = [];

    // Calculate totals for every user in the server
    for (const [storedUserId, stats] of Object.entries(guildStats)) {
      let totalVoice = 0;
      let totalText = 0;

      for (const dates of Object.values(stats.voice || {})) {
        for (const [dateStr, ms] of Object.entries(dates)) {
          if (!timeframeDays || new Date(dateStr).getTime() >= cutoffMs) {
            totalVoice += ms;
          }
        }
      }

      for (const dates of Object.values(stats.text || {})) {
        for (const [dateStr, count] of Object.entries(dates)) {
          if (!timeframeDays || new Date(dateStr).getTime() >= cutoffMs) {
            totalText += count;
          }
        }
      }

      if (totalVoice > 0 || totalText > 0) {
        userTotals.push({ userId: storedUserId, totalVoice, totalText });
      }
    }

    // Sort and slice Top 10 for both Voice and Text
    const topVoice = [...userTotals]
      .sort((a, b) => b.totalVoice - a.totalVoice)
      .slice(0, 10);
    const topText = [...userTotals]
      .sort((a, b) => b.totalText - a.totalText)
      .slice(0, 10);

    // Beautiful formatter with Medals
    const formatLeaderboard = (list, isVoice) => {
      const filtered = list.filter((u) =>
        isVoice ? u.totalVoice > 0 : u.totalText > 0,
      );
      if (filtered.length === 0) return "> *No activity yet.*";

      return filtered
        .map((u, i) => {
          const rank =
            i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**${i + 1}.**`;
          const score = isVoice
            ? `\`${formatDuration(u.totalVoice)}\``
            : `\`${u.totalText} msgs\``;
          return `> ${rank} <@${u.userId}> **•** ${score}`;
        })
        .join("\n");
    };

    const timeLabel = timeframeDays
      ? `Past ${timeframeDays} Days`
      : "Lifetime Records";

    // Beautiful Custom Embed
    const embed = new EmbedBuilder()
      .setColor("#E8769B")
      .setAuthor({
        name: `🏆 ${message.guild.name} Activity Leaderboard`,
        iconURL: message.guild.iconURL({ dynamic: true }),
      })
      .setDescription(
        `Who is top fragging in the server?\n⏱️ **Timeframe:** \`${timeLabel}\``,
      )
      .addFields(
        {
          name: "🎧 Top Voice Connects",
          value: formatLeaderboard(topVoice, true),
          inline: false,
        },
        {
          name: "📝 Top Text Chatters",
          value: formatLeaderboard(topText, false),
          inline: false,
        },
      )
      .setFooter({
        text: "🎀 𝓓𝓲𝓿𝓪𝓪 𝓑𝓸𝓽 🎀",
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
  if (args[0].toLowerCase() === "s?u") {
    // Get mentioned user, or default to the person who sent the message
    const targetUser = message.mentions.users.first() || message.author;
    const guildId = message.guildId;

    // Look through arguments to see if a number was typed (e.g., "7", "14")
    let timeframeDays = null;
    let cutoffMs = 0;

    for (const arg of args.slice(1)) {
      // If it's a pure number, treat it as the day filter
      if (/^\d+$/.test(arg)) {
        timeframeDays = parseInt(arg, 10);
        cutoffMs = Date.now() - timeframeDays * 24 * 60 * 60 * 1000;
        break;
      }
    }

    // Force update current VC time if they are in VC right now
    const currentSession = voiceSessions.get(targetUser.id);
    if (currentSession) {
      recordVoiceTime(
        guildId,
        targetUser.id,
        currentSession.channelId,
        currentSession.joinTime,
      );
      voiceSessions.set(targetUser.id, {
        channelId: currentSession.channelId,
        joinTime: Date.now(),
      });
    }

    const stats = activityStore[guildId]?.[targetUser.id] || {
      voice: {},
      text: {},
    };

    let totalVoiceMs = 0;
    let totalMessages = 0;
    const voiceByChannel = {};
    const textByChannel = {};

    // Aggregate Voice Data with Timeframe filter
    for (const [channelId, dates] of Object.entries(stats.voice || {})) {
      for (const [dateStr, ms] of Object.entries(dates)) {
        const timestamp = new Date(dateStr).getTime();
        if (!timeframeDays || timestamp >= cutoffMs) {
          totalVoiceMs += ms;
          voiceByChannel[channelId] = (voiceByChannel[channelId] || 0) + ms;
        }
      }
    }

    // Aggregate Text Data with Timeframe filter
    for (const [channelId, dates] of Object.entries(stats.text || {})) {
      for (const [dateStr, count] of Object.entries(dates)) {
        const timestamp = new Date(dateStr).getTime();
        if (!timeframeDays || timestamp >= cutoffMs) {
          totalMessages += count;
          textByChannel[channelId] = (textByChannel[channelId] || 0) + count;
        }
      }
    }

    // Helper function to format all channels beautifully while respecting Discord limits
    const formatChannelList = (channelData, isVoice) => {
      const sorted = Object.entries(channelData).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0)
        return "> *No activity recorded for this period.*";

      let list = "";
      for (const [id, val] of sorted) {
        const row = isVoice
          ? `> 🎙️ <#${id}> **•** \`${formatDuration(val)}\`\n`
          : `> 💬 <#${id}> **•** \`${val} msgs\`\n`;

        if (list.length + row.length > 950) {
          list += "> *...and more channels*";
          break;
        }
        list += row;
      }
      return list;
    };

    const voiceList = formatChannelList(voiceByChannel, true);
    const textList = formatChannelList(textByChannel, false);

    // Label for the time scale header
    const timeLabel = timeframeDays
      ? `Past ${timeframeDays} Days`
      : "Lifetime Records";

    // Beautiful Custom Embed
    const embed = new EmbedBuilder()
      .setColor("#E8769B")
      .setAuthor({
        name: `Activity Profile — ${targetUser.username}`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(targetUser.displayAvatarURL({ size: 512, dynamic: true }))
      .setDescription(
        `Server tracking records for <@${targetUser.id}>\n⏱️ **Timeframe:** \`${timeLabel}\`\n\n**🏆 Summary Totals**\n> 🗣️ **Voice:** \`${formatDuration(totalVoiceMs)}\`\n> ⌨️ **Text:** \`${totalMessages}\` messages\n\n**📈 Breakdown by Channel**`,
      )
      .addFields(
        { name: "🎧 Voice Channels", value: voiceList, inline: false },
        { name: "📝 Text Channels", value: textList, inline: false },
      )
      .setFooter({
        text: "🎀 𝓓𝓲𝓿𝓪𝓪 𝓑𝓸𝓽 🎀",
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  }

  const rawContent = message.content;
  const msg = rawContent.toLowerCase().trim();

  // --- VANITY COMMAND WITHOUT BOT MENTION ---
  if (msg === "vanity") {
    try {
      if (!message.guild.features.includes("VANITY_URL")) {
        return message.reply("❌ No vanity URL.");
      }

      const vanity = await message.guild.fetchVanityData();

      return message.reply(`https://discord.gg/${vanity.code}`);
    } catch (error) {
      console.error("Vanity Fetch Error:", error);
      return message.reply("❌ Could not fetch vanity.");
    }
  }
  if (msg === ".quote") {
    if (!message.reference) {
      return message.reply(
        "⚠️ Reply to the message you want to quote, then type `.quote`.",
      );
    }

    try {
      const quoted = await message.channel.messages.fetch(
        message.reference.messageId,
      );
      if (!quoted) {
        return message.reply("❌ Could not find the message you replied to.");
      }
      if (!quoted.content && quoted.attachments.size === 0) {
        return message.reply("⚠️ That message has no text to quote.");
      }

      const quoteChannel = QUOTE_CHANNEL_ID
        ? message.guild.channels.cache.get(QUOTE_CHANNEL_ID)
        : message.channel;

      if (!quoteChannel) {
        return message.reply(
          "❌ Quote channel not found — check QUOTE_CHANNEL_ID.",
        );
      }

      const avatarURL = quoted.author.displayAvatarURL({
        extension: "png",
        size: 256,
      });
      const text = quoted.content || "(no text — attachment only)";

      const buffer = await generateQuoteImage({
        avatarURL,
        authorName: quoted.member?.displayName || quoted.author.username,
        authorTag: quoted.author.username,
        text,
      });

      await quoteChannel.send({
        files: [{ attachment: buffer, name: "quote.png" }],
      });

      if (quoteChannel.id !== message.channel.id) {
        await message.react("✅").catch(() => {});
      }
    } catch (err) {
      console.error("Quote generation error:", err);
      message.reply("❌ Failed to generate the quote image.");
    }
    return;
  }
  if (message.channel.type === ChannelType.DM && msg.startsWith(".confess")) {
    const confessionText = rawContent
      .slice(rawContent.toLowerCase().indexOf(".confess") + ".confess".length)
      .trim();

    if (!confessionText) {
      return message.reply(
        "⚠️ Write your confession after the command, e.g. `.confess I secretly hate pineapple on pizza`.",
      );
    }

    if (!CONFESSION_CHANNEL_ID) {
      return message.reply(
        "❌ Confessions aren't set up yet — ask an admin to configure CONFESSION_CHANNEL_ID.",
      );
    }

    const token = `${message.author.id}_${Date.now()}`;
    pendingConfessions.set(token, {
      userId: message.author.id,
      text: confessionText,
    });

    const previewEmbed = new EmbedBuilder()
      .setTitle("📝 Confession Preview")
      .setDescription(confessionText)
      .setColor(0x9b59b6)
      .setFooter({
        text: "Posted completely anonymously — your identity is never shown or logged in the message.",
      });

    await message.reply({
      content: "Post this confession anonymously in the server?",
      embeds: [previewEmbed],
      components: [buildConfessionConfirmRow(token)],
    });
    return;
  }

  // Other commands still require bot mention
  if (!message.mentions.has(client.user)) return;

  // --- LIST CHANNELS (open to everyone) ---
  if (msg.includes("list channels")) {
    const allChannels = await message.guild.channels.fetch();
    const sorted = [...allChannels.values()]
      .filter(Boolean)
      .sort((a, b) => a.position - b.position);

    lastListCache.set(message.author.id, sorted);

    const list = sorted
      .map((c, i) => `**${i + 1}.** ${c} (${ChannelType[c.type]})`)
      .join("\n");

    if (list.length <= 1900) {
      return message.reply(`📋 Channels:\n${list}`);
    } else {
      const chunks = list.match(/[\s\S]{1,1900}/g);
      for (const chunk of chunks) await message.reply(chunk);
      return;
    }
  }

  // --- PICK BY NUMBER (open to everyone) ---
  const pickMatch = msg.match(/pick (\d+)/);
  if (pickMatch) {
    const index = parseInt(pickMatch[1], 10) - 1;
    const cached = lastListCache.get(message.author.id);

    if (!cached) {
      return message.reply(
        "⚠️ Run `@bot list channels` first so I know what number refers to what.",
      );
    }
    if (index < 0 || index >= cached.length) {
      return message.reply(
        `⚠️ That number is out of range (1-${cached.length}).`,
      );
    }

    return message.reply(`✅ That's ${cached[index]}`);
  }

  // --- FIND CHANNEL (open to everyone) ---
  if (msg.includes("find")) {
    const withoutMention = rawContent.replace(/<@!?\d+>/g, "").trim();
    const searchTerm = withoutMention.replace(/find/i, "").trim();

    if (!searchTerm) {
      return message.reply(
        "⚠️ Tell me what to search for, e.g. `@bot find general`.",
      );
    }

    const normalizedSearch = normalize(searchTerm);
    if (!normalizedSearch) {
      return message.reply("⚠️ Give me some letters/numbers to search with.");
    }

    const allChannels = await message.guild.channels.fetch();
    const matches = [...allChannels.values()].filter((channel) => {
      if (!channel) return false;
      return normalize(channel.name).includes(normalizedSearch);
    });

    if (matches.length === 0) {
      return message.reply(
        `❌ No channel found matching "${searchTerm}". If its name is pure symbols/emoji, try \`@bot list channels\` instead and pick it by number.`,
      );
    }
    if (matches.length === 1) {
      return message.reply(`✅ Found it: ${matches[0]}`);
    }

    const list = matches.map((c) => `${c} (${ChannelType[c.type]})`).join("\n");
    return message.reply(`🔎 Found ${matches.length} matches:\n${list}`);
  }
  // --- VANITY INFO ---
  if (msg.includes("vanity")) {
    try {
      if (!message.guild.features.includes("VANITY_URL")) {
        return message.reply("❌ This server does not have a Vanity URL.");
      }

      const vanity = await message.guild.fetchVanityData();

      return message.reply(
        `🔗 **Vanity URL:** discord.gg/${vanity.code}\n` +
          `📊 **Vanity Uses:** ${vanity.uses ?? 0}`,
      );
    } catch (error) {
      console.error("Vanity Fetch Error:", error);

      return message.reply(
        "❌ Could not fetch vanity data. Make sure the bot has **Manage Server** permission.",
      );
    }
  }

  // --- Below this point: restricted commands (Canary + OBS recording) ---
  const allowedUsers = process.env.ALLOWED_USER_IDS.split(",");
  if (!allowedUsers.includes(message.author.id)) {
    return message.reply("⛔ You do not have permission to control this bot.");
  }

  // --- CANARY CONTROLS ---
  if (msg.includes("bring canary")) {
    try {
      const yourVoiceChannel = message.member.voice.channel;
      if (!yourVoiceChannel) {
        return message.reply(
          "⚠️ You need to be inside a voice channel first so I know where to bring Canary!",
        );
      }
      const canaryMember = await message.guild.members.fetch(
        process.env.CANARY_USER_ID,
      );
      if (!canaryMember.voice.channel) {
        return message.reply(
          "⚠️ Canary is completely disconnected. Please manually join it to any voice lobby first!",
        );
      }
      await canaryMember.voice.setChannel(yourVoiceChannel);
      return message.reply(
        `✅ Brought Canary into **${yourVoiceChannel.name}**.`,
      );
    } catch (error) {
      console.error("Canary Bring Error:", error);
      return message.reply(
        "❌ Failed to bring Canary. Check my permissions and ensure CANARY_USER_ID is correct.",
      );
    }
  }

  if (msg.includes("remove canary")) {
    try {
      const canaryMember = await message.guild.members.fetch(
        process.env.CANARY_USER_ID,
      );
      if (!canaryMember.voice.channel) {
        return message.reply("⚠️ Canary is already disconnected.");
      }
      await canaryMember.voice.disconnect();
      return message.reply("👋 Kicked Canary out of the voice channel.");
    } catch (error) {
      console.error("Canary Remove Error:", error);
      return message.reply("❌ Failed to remove Canary. Check my permissions.");
    }
  }

  // --- OBS COMMANDS ---
  try {
    const status = await obs.call("GetRecordStatus");

    if (msg.includes("isrecording")) {
      return message.reply(
        status.outputActive
          ? "🟢 OBS is Recording."
          : "🔴 OBS is NOT Recording.",
      );
    }
    if (msg.includes("start recording")) {
      if (status.outputActive) return message.reply("Already recording.");
      await obs.call("StartRecord");
      return message.reply("Started Recording.");
    }
    if (msg.includes("stop recording")) {
      if (!status.outputActive)
        return message.reply("Recording already stopped.");
      await obs.call("StopRecord");
      return message.reply("Stopped Recording.");
    }
  } catch (err) {
    console.error("OBS Communication Error:", err);
    if (!msg.includes("canary")) {
      message.reply("Cannot communicate with OBS. Is it running?");
    }
  }
});
// =====================================================================
// ================= SERVER TAG AUTO ROLES ==============================
// =====================================================================

const TAG_ROLE_IDS = [
  process.env.TAG_ROLE_ID_1,
  process.env.TAG_ROLE_ID_2,
].filter(Boolean);

// Gifs shown on the "tag adopted" / "tag removed" embeds (one picked at random each time)
const TAG_GRANT_GIFS = [
  "https://media.tenor.com/6xW1RQC5v7wAAAAC/sparkle-celebration.gif",
  "https://media.tenor.com/2roX6XgFP4AAAAAC/confetti-celebrate.gif",
  "https://media.tenor.com/4dHF9YbxKzMAAAAC/party-popper-confetti.gif",
];
const TAG_REMOVE_GIFS = [
  "https://media.tenor.com/2ND1sB5D4A0AAAAC/bye-bye.gif",
  "https://media.tenor.com/6oj4gwvLdKcAAAAC/goodbye-bye.gif",
  "https://media.tenor.com/6H_JsvzE-p4AAAAC/sad-bye.gif",
];

async function announceTagChange(member, granted) {
  const channel = member.guild.channels.cache.get(
    process.env.TAG_ANNOUNCE_CHANNEL_ID,
  );
  if (!channel?.isTextBased()) return;

  const roleList = TAG_ROLE_IDS.map((id) => `💎 <@&${id}>`).join("\n");
  const roleMentions = TAG_ROLE_IDS.map((id) => `<@&${id}>`).join(" and ");

  const embed = granted
    ? new EmbedBuilder()
        .setColor(0xf47fff)
        .setAuthor({
          name: `${member.guild.name} — Server Tag`,
          iconURL: member.guild.iconURL() || undefined,
        })
        .setTitle("💎 ✨ PERKS UNLOCKED ✨ 💎")
        .setDescription(
          `${member} just repped **${member.guild.name}** as their profile tag! 🎉\n\n` +
            `> Thanks for flexing us on your profile 🩷`,
        )
        .addFields(
          { name: "🎁 Perks Unlocked", value: roleList },
          {
            name: "📌 How to keep it",
            value: "Just keep this server set as your profile tag — that's it!",
          },
        )
        .setThumbnail(member.displayAvatarURL({ size: 256 }))
        .setImage(
          TAG_GRANT_GIFS[Math.floor(Math.random() * TAG_GRANT_GIFS.length)],
        )
        .setFooter({
          text: "🍒 Baddie Cafe Perks",
          iconURL: member.guild.iconURL() || undefined,
        })
        .setTimestamp()
    : new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({
          name: `${member.guild.name} — Server Tag`,
          iconURL: member.guild.iconURL() || undefined,
        })
        .setTitle("💔 Tag Removed — Perks Revoked")
        .setDescription(
          `${member} removed this server as their profile tag, so ` +
            `${roleMentions} ${TAG_ROLE_IDS.length > 1 ? "have" : "has"} been taken back.`,
        )
        .setThumbnail(member.displayAvatarURL({ size: 256 }))
        .addFields({
          name: "Want your perks back?",
          value: "Set the tag again anytime from your profile settings! 🍒",
        })
        .setImage(
          TAG_REMOVE_GIFS[Math.floor(Math.random() * TAG_REMOVE_GIFS.length)],
        )
        .setFooter({
          text: "🍒 Baddie Cafe Perks",
          iconURL: member.guild.iconURL() || undefined,
        })
        .setTimestamp();

  await channel
    .send({ embeds: [embed] })
    .catch((err) =>
      console.error("Failed to send tag announcement embed:", err),
    );
}

async function syncServerTagRoles(member) {
  if (!member || member.user.bot) return;

  try {
    const user = await member.user.fetch(true);
    const primaryGuild = user.primaryGuild;

    const hasOurTag =
      primaryGuild?.identityEnabled === true &&
      primaryGuild?.identityGuildId === member.guild.id;

    const rolesToAdd = TAG_ROLE_IDS.filter(
      (roleId) => !member.roles.cache.has(roleId),
    );

    const rolesToRemove = TAG_ROLE_IDS.filter((roleId) =>
      member.roles.cache.has(roleId),
    );

    if (hasOurTag) {
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd, "Adopted server tag");

        console.log(`TAG ROLES ADDED: ${member.user.tag}`);

        await announceTagChange(member, true);
      }
    } else {
      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove, "Removed server tag");

        console.log(`TAG ROLES REMOVED: ${member.user.tag}`);

        await announceTagChange(member, false);
      }
    }
  } catch (error) {
    console.error(`Server tag role error for ${member.user.tag}:`, error);
  }
}

// Detect server tag changes
client.on("userUpdate", async (oldUser, newUser) => {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return;

  const member = await guild.members.fetch(newUser.id).catch(() => null);
  if (!member) return;

  await syncServerTagRoles(member);
});

// Check member when they join
client.on("guildMemberAdd", async (member) => {
  await syncServerTagRoles(member);
});

// Backup check every 5 minutes
setInterval(
  async () => {
    const guild = client.guilds.cache.get(process.env.TAG_GUILD_ID);
    if (!guild) return;

    const members = await guild.members.fetch();

    for (const member of members.values()) {
      await syncServerTagRoles(member);
    }
  },
  5 * 60 * 1000,
);
client.on("guildMemberAdd", async (member) => {
  if (!WELCOME_CHANNEL_ID) return;

  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0xffa1c9) // Cute pastel pink
    .setTitle("🎀 Welcome to the Cafe! 🎀")
    .setDescription(
      `Hi there, ${member}! Welcome to **${member.guild.name}**! 🍰✨\n\n` +
        `We're so happy you're here, bestie! Grab a seat, grab a matcha, and make yourself at home. 🍡💕`,
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setImage(
      "https://media.tenor.com/t27w6m99f8oAAAAC/hello-kitty-welcome.gif",
    ) // Cute Hello Kitty gif
    .addFields(
      {
        name: "✨ Member Count",
        value: `${member.guild.memberCount} hotties!`,
        inline: true,
      },
      { name: "🍒 Check out", value: "<#1524355599205138554>", inline: true },
    )
    .setFooter({
      text: "Stay sweet & keep it baddie! 🎀",
      iconURL: member.guild.iconURL(),
    })
    .setTimestamp();

  await channel
    .send({ content: `Hey ${member}! 🌸`, embeds: [welcomeEmbed] })
    .catch(console.error);
});
client.login(process.env.DISCORD_TOKEN);
