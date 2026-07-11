/**
 * Invite Tracker Bot — single-file Discord bot
 * -----------------------------------------------------
 * Tracks how many people each member has invited to the server, and lets
 * admins/owner reset a member's invite count. Separate bot from the
 * giveaway one — run it as its own process with its own token, or merge
 * the pieces into one bot later if you want a single process.
 *
 * Setup:
 *   1. npm install discord.js dotenv
 *   2. In the Discord Developer Portal → your app → Bot, enable the
 *      "Server Members Intent" toggle (required to detect joins/leaves).
 *   3. Create a .env file next to this one with:
 *        DISCORD_TOKEN=your_bot_token
 *        CLIENT_ID=your_application_client_id
 *        GUILD_ID=your_server_id          # optional, instant command registration
 *        INVITE_ADMIN_ROLE_IDS=roleId1,roleId2   # optional
 *        INVITE_ADMIN_USER_IDS=userId1,userId2   # optional
 *   4. Invite the bot with the "Manage Server" permission — it needs that
 *      to read the server's invite list.
 *   5. node invites.js
 *
 * Commands:
 *   /invites view [user]      — shows invite stats for a member (defaults to you)
 *   /invites leaderboard      — top 10 inviters in the server
 *   /invites reset user:<u>   — admin/owner only, zeroes out a member's stats
 *
 * Data persists to invites.json so counts survive a bot restart.
 */

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const DATA_FILE = path.join(__dirname, "invites.json");
const HISTORY_FILE = path.join(__dirname, "invite-history.jsonl");

// ---------- audit log ----------
// Every join, leave, and reset gets appended as its own line of JSON to
// invite-history.jsonl. This is separate from invites.json (which only
// holds current totals) so you always have a raw, append-only record of
// exactly who was credited, who was reset, and by whom — useful for
// debugging if a count ever looks wrong.

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

// ---------- persistence ----------
// Shape: { [guildId]: { users: { [userId]: {regular, leaves} }, joins: { [memberId]: {inviterId, code} } } }

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  // Atomic write: write to a temp file, then rename over the real one.
  // This avoids ending up with a truncated/corrupt invites.json if the
  // process gets killed mid-write.
  const tmpFile = DATA_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, DATA_FILE);
}

let store = loadData();

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

// ---------- permissions ----------

const ADMIN_ROLE_IDS = (process.env.INVITE_ADMIN_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ADMIN_USER_IDS = (process.env.INVITE_ADMIN_USER_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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

// ---------- invite cache ----------
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
      `Could not fetch invites for "${guild.name}" — make sure the bot has Manage Server permission there.`,
    );
  }

  if (guild.features?.includes("VANITY_URL")) {
    try {
      const vanity = await guild.fetchVanityData();
      vanityCache.set(guild.id, vanity.uses ?? 0);
    } catch {
      // guild has no vanity URL set up, or fetch failed — ignore
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

// ---------- slash commands ----------

const commands = [
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

// ---------- client ----------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Data file:    ${DATA_FILE}`);
  console.log(`History file: ${HISTORY_FILE}`);

  const guildCount = Object.keys(store).length;
  const userCount = Object.values(store).reduce(
    (sum, g) => sum + Object.keys(g.users || {}).length,
    0,
  );
  console.log(
    `Loaded existing data for ${guildCount} guild(s), ${userCount} tracked user(s). ` +
      (userCount === 0
        ? "If you expected existing counts here, make sure this script is running from the same folder as last time (invites.json must sit next to invites.js)."
        : ""),
  );

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

  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild);
  }

  if (ADMIN_ROLE_IDS.length === 0 && ADMIN_USER_IDS.length === 0) {
    console.log(
      "No INVITE_ADMIN_ROLE_IDS / INVITE_ADMIN_USER_IDS set — only Administrators, Manage Server holders, and the server owner can reset invites.",
    );
  }
});

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
  if (member.user.bot) return; // don't count bots joining via OAuth as invites

  const { inviterId, code } = await resolveUsedInvite(member.guild);

  if (!inviterId) {
    // Vanity URL or undetectable invite — nothing to attribute
    return;
  }
  if (inviterId === member.id) return; // safety: don't let someone credit themselves

  const g = ensureGuild(member.guild.id);
  const stats = ensureUser(member.guild.id, inviterId);
  stats.regular += 1;
  g.joins[member.id] = { inviterId, code };
  saveData(store);
  logEvent({
    type: "join",
    guildId: member.guild.id,
    userId: member.id, // the person who joined
    inviterId, // the person credited with the invite
    code,
  });
});

client.on("guildMemberRemove", (member) => {
  const g = ensureGuild(member.guild.id);
  const record = g.joins[member.id];
  if (!record) return;

  const stats = ensureUser(member.guild.id, record.inviterId);
  stats.leaves += 1;
  delete g.joins[member.id];
  saveData(store);
  logEvent({
    type: "leave",
    guildId: member.guild.id,
    userId: member.id, // the person who left
    inviterId: record.inviterId, // the person who gets debited
  });
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (
      !interaction.isChatInputCommand() ||
      interaction.commandName !== "invites"
    )
      return;

    const sub = interaction.options.getSubcommand();

    if (sub === "view") {
      const target = interaction.options.getUser("user") || interaction.user;
      const stats = ensureUser(interaction.guildId, target.id);
      saveData(store);

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
      saveData(store);
      logEvent({
        type: "reset",
        guildId: interaction.guildId,
        targetUserId: target.id, // whose stats were reset
        actorId: interaction.user.id, // who reset them
        previousStats, // what they had before, in case you need to restore it
      });

      return interaction.reply({
        content: `Reset invite stats for **${target.username}**.`,
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
        return `${ts} — unknown event`;
      });

      return interaction.reply({
        content: lines.join("\n"),
        flags: MessageFlags.Ephemeral,
      });
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

client.login(process.env.DISCORD_TOKEN);
