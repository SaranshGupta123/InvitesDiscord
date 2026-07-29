require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.DISCORD_TOKEN;
const STATS_FILE = path.join(__dirname, "stats.json");

// Helper function to load stats from file
function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading stats file:", err);
  }
  return {};
}

// Helper function to save stats to file
function saveStats(data) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing stats file:", err);
  }
}

client.once("clientReady", () => {
  console.log(`✨ Logged in as ${client.user.tag}!`);
});

// Listen to every message in real-time
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  // Track live message counts per channel
  let stats = loadStats();
  const guildId = message.guild.id;
  const channelId = message.channel.id;

  if (!stats[guildId]) {
    stats[guildId] = {};
  }
  if (!stats[guildId][channelId]) {
    stats[guildId][channelId] = 0;
  }

  stats[guildId][channelId]++;
  saveStats(stats);

  // Handle !stats command
  if (message.content !== "!stats") return;

  if (
    !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return message.reply(
      "❌ *Only Administrators can use this command, silly!*",
    );
  }

  const guild = message.guild;
  const guildStats = stats[guildId] || {};

  let totalMessages = 0;
  const channelStatsArray = [];

  for (const [chId, count] of Object.entries(guildStats)) {
    const channel = guild.channels.cache.get(chId);
    if (channel && channel.type === ChannelType.GuildText) {
      totalMessages += count;
      channelStatsArray.push({ id: chId, count });
    }
  }

  // Sort channels from highest to lowest message count
  channelStatsArray.sort((a, b) => b.count - a.count);

  // Build leaderboard
  const leaderboardLines = channelStatsArray.map((c, i) => {
    const rankEmojis = ["🥇", "🥈", "🥉"];
    const rank = rankEmojis[i] || `\`#${i + 1}\``;
    const formattedCount = c.count.toLocaleString();

    return `${rank} <#${c.id}> • \`${formattedCount}\` messages`;
  });

  let leaderboardValue =
    leaderboardLines.join("\n") || "No messages tracked yet!";
  if (leaderboardValue.length > 1024) {
    leaderboardValue = leaderboardValue.substring(0, 1021) + "...";
  }

  const embed = new EmbedBuilder()
    .setColor("#FFB6C1")
    .setTitle("🎀 Live Server Activity Statistics")
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setDescription(
      `> ✨ Real-time tracking stats for **${guild.name}**!\n\n` +
        "```yaml\n" +
        `📁 Active Channels : ${channelStatsArray.length}\n` +
        `💬 Total Messages  : ${totalMessages.toLocaleString()}\n` +
        "```",
    )
    .addFields({
      name: "🏆 Channel Leaderboard",
      value: leaderboardValue,
      inline: false,
    })
    .setFooter({
      text: `Requested by ${message.author.tag}`,
      iconURL: message.author.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
});

client.login(TOKEN);
