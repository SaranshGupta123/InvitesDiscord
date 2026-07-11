/**
 * Giveaway Bot — single-file Discord bot
 * -----------------------------------------------------
 * Setup:
 *   1. npm install discord.js dotenv
 *   2. Create a .env file next to this one with:
 *        DISCORD_TOKEN=your_bot_token
 *        CLIENT_ID=your_application_client_id
 *   3. node index.js
 *      (slash commands auto-register on startup, guild-wide takes up to 1hr
 *       to propagate globally — for instant testing, set GUILD_ID in .env too)
 *
 * Commands:
 *   /giveaway start prize:<text> winners:<number> duration:<e.g. 10m, 1h, 2d>
 *   /giveaway end message_id:<id>
 *   /giveaway reroll message_id:<id>
 *   /giveaway list
 *
 * IMPORTANT: for /giveaway end and /giveaway reroll, message_id must be the ID
 * of the ORIGINAL giveaway embed (the one with the 🎉 Enter button) — not the
 * "Giveaway ended!" announcement message the bot posts afterward. Right-click
 * (or long-press on mobile) the original embed and choose "Copy Message ID".
 *
 * Who can run giveaway commands is controlled entirely by ALLOWED_ROLE_IDS
 * and ALLOWED_USER_IDS in your .env — see below. Anyone can click the Enter
 * button; that part is intentionally unrestricted.
 *
 * Data persists to giveaways.json so giveaways survive a bot restart.
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
} = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const DATA_FILE = path.join(__dirname, "giveaways.json");
const ENTER_BUTTON_ID = "giveaway_enter";

// ---------- persistence ----------

function loadGiveaways() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveGiveaways(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let giveaways = loadGiveaways(); // keyed by messageId

// ---------- permissions ----------
// Set ALLOWED_ROLE_IDS and/or ALLOWED_USER_IDS in .env as comma-separated
// Discord IDs, e.g. ALLOWED_ROLE_IDS=123456789012345678,987654321098765432
// If BOTH are left empty, giveaway commands are open to everyone (not recommended).
// Server owners and members with Administrator can always use the commands.

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

// ---------- helpers ----------

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

// ---------- slash command definitions ----------

const commands = [
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
].map((c) => c.toJSON());

// ---------- client ----------

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Message, Partials.Channel],
});

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

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

  // Re-arm timers for any giveaways still active after a restart
  for (const [messageId, g] of Object.entries(giveaways)) {
    if (g.ended) continue;
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
});

client.on("interactionCreate", async (interaction) => {
  try {
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
    }

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
