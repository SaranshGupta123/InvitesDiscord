require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Fold stylized unicode (fullwidth, circled, mathematical bold/italic, etc.)
// down to plain ASCII where possible, THEN strip anything left that isn't a-z0-9.
function normalize(str) {
  return str
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "");
}

// Cache the last "list channels" result per-user so "pick N" knows what N refers to
const lastListCache = new Map(); // userId -> array of channels in listed order

client.once("clientReady", () => {
  console.log(`${client.user.tag} is online and ready!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  // No permission check here — channel search is open to everyone in the server.

  const rawContent = message.content;
  const msg = rawContent.toLowerCase();

  // --- LIST CHANNELS ---
  // Usage: @bot list channels
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

  // --- PICK BY NUMBER ---
  // Usage: @bot pick 7  (refers to the last "list channels" you ran)
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

  // --- FIND CHANNEL (fuzzy name search) ---
  // Usage: @bot find general
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
        `❌ No channel found matching "${searchTerm}". Try \`@bot list channels\` and pick it by number instead.`,
      );
    }
    if (matches.length === 1) {
      return message.reply(`✅ Found it: ${matches[0]}`);
    }

    const list = matches.map((c) => `${c} (${ChannelType[c.type]})`).join("\n");
    return message.reply(`🔎 Found ${matches.length} matches:\n${list}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
