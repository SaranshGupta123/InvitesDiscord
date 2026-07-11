require("dotenv").config();
const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const OBSWebSocket = require("obs-websocket-js").default;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const obs = new OBSWebSocket();

async function connectOBS() {
  try {
    await obs.connect(
      `ws://${process.env.OBS_HOST}:${process.env.OBS_PORT}`,
      process.env.OBS_PASSWORD,
    );
    console.log("Connected to OBS");
  } catch (err) {
    console.error("ACTUAL OBS ERROR:", err.message);
  }
}

client.once("clientReady", async () => {
  console.log(`${client.user.tag} is Online and Ready!`);
  await connectOBS();
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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const rawContent = message.content;
  const msg = rawContent.toLowerCase();

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

client.login(process.env.DISCORD_TOKEN);
