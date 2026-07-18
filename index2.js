require("dotenv").config();
const fs = require("fs");
const path = require("path");
const os = require("os");
const gTTS = require("gtts");
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  REST,
  Routes,
  SlashCommandBuilder,
  MessageFlags,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");

// --- CONFIGURATION ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Comma-separated list of user IDs allowed to trigger TTS/join/leave, e.g. "123,456,789"
const TTS_ALLOWED_USER_IDS = (process.env.TTS_ALLOWED_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

// Comma-separated list of role IDs also allowed to trigger TTS/join/leave, e.g. "111,222"
const TTS_ALLOWED_ROLE_IDS = (process.env.TTS_ALLOWED_ROLE_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

// Optional: restrict text-message TTS to a single channel.
// Leave blank to listen in every channel it can read.
const LISTEN_CHANNEL_ID = process.env.LISTEN_CHANNEL_ID || null;

const TTS_LANG = "hi"; // Hindi
// ---------------------

if (
  !TOKEN ||
  !CLIENT_ID ||
  !GUILD_ID ||
  (TTS_ALLOWED_USER_IDS.length === 0 && TTS_ALLOWED_ROLE_IDS.length === 0)
) {
  console.error(
    "Missing required env vars. Check DISCORD_TOKEN, CLIENT_ID, GUILD_ID in your .env file, " +
      "and set at least one of TTS_ALLOWED_USER_IDS or TTS_ALLOWED_ROLE_IDS.",
  );
  process.exit(1);
}

// A member is allowed if their user ID is listed directly, or if they hold
// any role listed in TTS_ALLOWED_ROLE_IDS.
function hasPermission(member) {
  if (!member) return false;
  if (TTS_ALLOWED_USER_IDS.includes(member.id)) return true;

  const roleCache = member.roles?.cache;
  if (TTS_ALLOWED_ROLE_IDS.length > 0 && roleCache) {
    if (roleCache.some((r) => TTS_ALLOWED_ROLE_IDS.includes(r.id))) return true;
  }

  return false;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

// Keep one active voice connection + player per guild
const connections = new Map();

// ---------- slash commands ----------

const commands = [
  new SlashCommandBuilder()
    .setName("speak")
    .setDescription("Speak a message in Hindi in a voice channel")
    .addStringOption((opt) =>
      opt.setName("message").setDescription("What to say").setRequired(true),
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Voice channel (defaults to your current one)")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Make the bot join a voice channel")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Voice channel (defaults to your current one)")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Make the bot leave its current voice channel"),
].map((c) => c.toJSON());

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}! Ready for Hindi TTS.`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log("Registered guild commands (instant).");
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
});

// ---------- voice connection helpers ----------

// Joins (or reuses an existing connection to) the given voice channel.
// Returns { connection, player }. Does NOT play anything by itself.
async function ensureVoiceConnection(voiceChannel) {
  const guildId = voiceChannel.guild.id;
  let entry = connections.get(guildId);

  if (entry && entry.connection.joinConfig.channelId === voiceChannel.id) {
    return entry;
  }

  // Already connected to a different channel in this guild — drop it first
  if (entry) {
    entry.connection.destroy();
    connections.delete(guildId);
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
  } catch (err) {
    connection.destroy();
    throw err;
  }

  const player = createAudioPlayer();
  connection.subscribe(player);

  entry = { connection, player };
  connections.set(guildId, entry);

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    connections.delete(guildId);
  });

  return entry;
}

function leaveVoiceChannel(guildId) {
  const entry = connections.get(guildId);
  if (!entry) return false;
  entry.connection.destroy();
  connections.delete(guildId);
  return true;
}

function textToSpeechFile(text) {
  return new Promise((resolve, reject) => {
    const tts = new gTTS(text, TTS_LANG);
    const filePath = path.join(
      os.tmpdir(),
      `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`,
    );
    tts.save(filePath, (err) => {
      if (err) return reject(err);
      resolve(filePath);
    });
  });
}

// Discord mentions are stored as raw tokens like <@1234567890>, <@&roleId>,
// or <#channelId>. Left as-is, gTTS reads the digits out loud instead of
// the person's name. This resolves each token to a readable name/word
// before the text goes to speech.
const MENTION_REGEX = /<@!?(\d+)>|<@&(\d+)>|<#(\d+)>/g;

// Custom server emotes are stored as <:name:123456789012345678> (static) or
// <a:name:123456789012345678> (animated) — same deal, the long numeric ID
// would otherwise get read out. This strips it down to just the emote name,
// with underscores turned into spaces so it reads more naturally
// (e.g. "cry_cat" -> "cry cat" instead of "cry underscore cat").
const EMOJI_REGEX = /<a?:(\w+):\d+>/g;

function resolveEmojisForSpeech(text) {
  return text.replace(EMOJI_REGEX, (_, name) => name.replace(/_/g, " "));
}

async function resolveMentionsForSpeech(text, guild) {
  if (!guild) return text;

  const matches = [...text.matchAll(MENTION_REGEX)];
  if (matches.length === 0) return text;

  let result = text;
  for (const [full, userId, roleId, channelId] of matches) {
    let replacement = "";

    if (userId) {
      let member = guild.members.cache.get(userId);
      if (!member) member = await guild.members.fetch(userId).catch(() => null);
      replacement = member ? member.displayName : "someone";
    } else if (roleId) {
      const role = guild.roles.cache.get(roleId);
      replacement = role ? role.name : "everyone";
    } else if (channelId) {
      const channel = guild.channels.cache.get(channelId);
      replacement = channel ? channel.name : "a channel";
    }

    result = result.replace(full, replacement);
  }

  return result;
}

// Runs both cleanup passes: emotes first (simple sync replace), then
// mentions (needs async member lookups).
async function resolveTextForSpeech(text, guild) {
  const withoutEmojis = resolveEmojisForSpeech(text);
  return resolveMentionsForSpeech(withoutEmojis, guild);
}

async function speakInChannel(voiceChannel, text) {
  const entry = await ensureVoiceConnection(voiceChannel);

  let filePath;
  try {
    filePath = await textToSpeechFile(text);
  } catch (err) {
    console.error("TTS generation failed:", err);
    return;
  }

  const resource = createAudioResource(filePath);
  entry.player.play(resource);

  entry.player.once(AudioPlayerStatus.Idle, () => {
    fs.unlink(filePath, () => {});
  });
}

// ---------- message-based trigger (unchanged behavior) ----------

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild || message.guild.id !== GUILD_ID) return;
  if (LISTEN_CHANNEL_ID && message.channel.id !== LISTEN_CHANNEL_ID) return;

  const member =
    message.member ||
    (await message.guild.members.fetch(message.author.id).catch(() => null));

  // Only allow specific people/roles to trigger TTS
  if (!hasPermission(member)) return;

  const text = message.content?.trim();
  if (!text) return;

  const voiceChannel = member?.voice?.channel;

  if (!voiceChannel) {
    message
      .reply("Join a voice channel first, then send your message again! 🎙️")
      .catch(() => {});
    return;
  }

  try {
    const spokenText = await resolveTextForSpeech(text, message.guild);
    await speakInChannel(voiceChannel, spokenText);
  } catch (err) {
    console.error("Failed to speak message:", err);
  }
});

// ---------- slash commands ----------

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild || interaction.guild.id !== GUILD_ID) return;

  // Only allow specific people/roles to use these commands
  if (!hasPermission(interaction.member)) {
    await interaction.reply({
      content: "You're not allowed to use this command. 🚫",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  async function resolveVoiceChannel() {
    const chosenChannel = interaction.options.getChannel("channel");
    if (chosenChannel) return chosenChannel;

    const member = await interaction.guild.members
      .fetch(interaction.user.id)
      .catch(() => null);
    return member?.voice?.channel || null;
  }

  if (interaction.commandName === "speak") {
    const text = interaction.options.getString("message", true).trim();
    const voiceChannel = await resolveVoiceChannel();

    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
      await interaction.reply({
        content:
          "Join a voice channel first, or pick one with the `channel` option. 🎙️",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: `Joining **${voiceChannel.name}** and speaking your message in Hindi... 🗣️`,
      flags: MessageFlags.Ephemeral,
    });

    try {
      const spokenText = await resolveTextForSpeech(text, interaction.guild);
      await speakInChannel(voiceChannel, spokenText);
    } catch (err) {
      console.error("Failed to speak message via /speak:", err);
    }
    return;
  }

  if (interaction.commandName === "join") {
    const voiceChannel = await resolveVoiceChannel();

    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
      await interaction.reply({
        content:
          "Join a voice channel first, or pick one with the `channel` option. 🎙️",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await ensureVoiceConnection(voiceChannel);
      await interaction.reply({
        content: `Joined **${voiceChannel.name}**. 🎧`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error("Failed to join voice channel via /join:", err);
      await interaction.reply({
        content:
          "Couldn't join that voice channel. Check my permissions and try again.",
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  if (interaction.commandName === "leave") {
    const left = leaveVoiceChannel(interaction.guild.id);
    await interaction.reply({
      content: left
        ? "Left the voice channel. 👋"
        : "I'm not in a voice channel right now.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
});

client.login(TOKEN);
