const {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
  ChannelType, // <-- Add this
} = require("discord.js");
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
} = require("@discordjs/voice");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const USERS_FILE = "./server_users.json";
const PLAYLISTS_FILE = "./server_playlists.json";

const GLOBAL_ADMINS = ["1355201526716694590", "482137869251772427"];
const serverPlayers = new Map();

// --- Locate yt-dlp: prefer a copy sitting next to this script, else fall back to PATH ---
const LOCAL_YTDLP = path.join(__dirname, "yt-dlp.exe");
const YTDLP_CMD = fs.existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : "yt-dlp";

function readJSON(file) {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return {};
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getServerUsers(guildId) {
  const data = readJSON(USERS_FILE);
  return data[guildId] || [];
}

function getServerPlaylist(guildId) {
  const data = readJSON(PLAYLISTS_FILE);
  return data[guildId] || ["https://www.youtube.com/watch?v=kyqpSycLASY"];
}

// --- yt-dlp -> ffmpeg pipeline: yt-dlp grabs the audio, ffmpeg converts it to raw PCM ---
// Raw PCM sidesteps any container/codec probing issues entirely.
// No cookies file needed: these player clients aren't currently gated behind
// YouTube's sign-in/PO Token check for ordinary public videos, so yt-dlp can
// fetch formats without any account/browser session attached.
function createAudioPipeline(url) {
  const args = [
    "--extractor-args",
    "youtube:player_client=android_vr,web_embedded,tv",
    url,
    "-f",
    "bestaudio",
    "-o",
    "-",
    "--no-playlist",
    "--quiet",
    "--no-warnings",
  ];

  const ytdlp = spawn(YTDLP_CMD, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  ytdlp.on("error", (err) => {
    console.error(
      `[yt-dlp] Failed to start (${YTDLP_CMD}):`,
      err.message,
      err.code === "ENOENT"
        ? "-> yt-dlp.exe not found next to the script and not on PATH."
        : "",
    );
  });
  ytdlp.stderr.on("data", (chunk) => {
    console.error(`[yt-dlp stderr] ${chunk.toString().trim()}`);
  });

  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-i",
      "pipe:0",
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-loglevel",
      "error",
      "pipe:1",
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  ffmpeg.on("error", (err) => {
    console.error("[ffmpeg] Failed to start:", err.message);
  });
  ffmpeg.stderr.on("data", (chunk) => {
    console.error(`[ffmpeg stderr] ${chunk.toString().trim()}`);
  });

  ytdlp.stdout.pipe(ffmpeg.stdin);

  // If ffmpeg's stdin closes early (e.g. yt-dlp died), don't crash the process
  ffmpeg.stdin.on("error", () => {});

  return {
    output: ffmpeg.stdout,
    kill: () => {
      ytdlp.kill();
      ffmpeg.kill();
    },
  };
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.on(Events.ClientReady, () => {
  console.log(`✅ Logged in successfully as ${client.user.tag}!`);
  console.log(`Using yt-dlp at: ${YTDLP_CMD}`);
  console.log(
    "Commands: !play | !stop | !add @user | !remove @user | !addsong <link>",
  );
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;

  const guildId = message.guild.id;

  const isGlobalAdmin = GLOBAL_ADMINS.includes(message.author.id);
  const isServerAdmin = message.member.permissions.has(
    PermissionsBitField.Flags.Administrator,
  );
  const allowedInThisServer = getServerUsers(guildId).includes(
    message.author.id,
  );

  const hasAccess = isGlobalAdmin || isServerAdmin || allowedInThisServer;

  // --- COMMAND: !add @user ---
  if (message.content.startsWith("!add ")) {
    if (!hasAccess)
      return message.reply("❌ You do not have permission to add new users!");

    const mentionedUser = message.mentions.users.first();
    if (!mentionedUser)
      return message.reply(
        "❌ Please mention the user. Example: `!add @username`",
      );

    let allUsersData = readJSON(USERS_FILE);
    if (!allUsersData[guildId]) allUsersData[guildId] = [];

    if (allUsersData[guildId].includes(mentionedUser.id)) {
      return message.reply(
        `⚠️ **${mentionedUser.username}** already has access in this server!`,
      );
    }

    allUsersData[guildId].push(mentionedUser.id);
    writeJSON(USERS_FILE, allUsersData);
    return message.reply(
      `✅ Granted bot access to **${mentionedUser.username}** for THIS server!`,
    );
  }

  // --- COMMAND: !remove @user ---
  if (message.content.startsWith("!remove ")) {
    if (!hasAccess)
      return message.reply("❌ You do not have permission to remove users!");

    const mentionedUser = message.mentions.users.first();
    if (!mentionedUser)
      return message.reply(
        "❌ Please mention the user. Example: `!remove @username`",
      );

    let allUsersData = readJSON(USERS_FILE);
    if (!allUsersData[guildId]) allUsersData[guildId] = [];

    if (!allUsersData[guildId].includes(mentionedUser.id)) {
      return message.reply(
        `⚠️ **${mentionedUser.username}** doesn't have bot access in this server!`,
      );
    }

    allUsersData[guildId] = allUsersData[guildId].filter(
      (id) => id !== mentionedUser.id,
    );
    writeJSON(USERS_FILE, allUsersData);
    return message.reply(
      `✅ Removed bot access from **${mentionedUser.username}** for THIS server!`,
    );
  }

  // --- COMMAND: !addsong <link1> <link2> <link3> ... ---
  if (message.content.startsWith("!addsong ")) {
    if (!hasAccess)
      return message.reply("❌ You do not have permission to add songs!");

    // Everything after "!addsong " split on whitespace, one or more links
    const rawArgs = message.content.split(" ").slice(1);
    if (rawArgs.length === 0)
      return message.reply(
        "❌ Please provide at least one YouTube link. Example: `!addsong link1 link2 link3`",
      );

    const validUrls = [];
    const invalidUrls = [];

    for (const arg of rawArgs) {
      const url = arg.trim();
      if (!url) continue;
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        validUrls.push(url);
      } else {
        invalidUrls.push(url);
      }
    }

    if (validUrls.length === 0) {
      return message.reply("❌ None of those looked like valid YouTube links.");
    }

    let allPlaylists = readJSON(PLAYLISTS_FILE);
    if (!allPlaylists[guildId])
      allPlaylists[guildId] = getServerPlaylist(guildId);

    allPlaylists[guildId].push(...validUrls);
    writeJSON(PLAYLISTS_FILE, allPlaylists);

    let reply = `✅ Added **${validUrls.length}** song${validUrls.length === 1 ? "" : "s"} to THIS server's playlist! Total songs: **${allPlaylists[guildId].length}**`;
    if (invalidUrls.length > 0) {
      reply += `\n⚠️ Skipped **${invalidUrls.length}** invalid link${invalidUrls.length === 1 ? "" : "s"}.`;
    }

    return message.reply(reply);
  }

  // --- COMMAND: !stop ---
  if (message.content === "!stop" || message.content === "!disconnect") {
    if (!hasAccess)
      return message.reply(
        "❌ You do not have permission to disconnect the bot!",
      );

    const connection = getVoiceConnection(guildId);
    if (!connection)
      return message.reply("❌ I am not currently playing in a voice channel!");

    const serverData = serverPlayers.get(guildId);
    if (serverData?.currentPipeline) {
      serverData.currentPipeline.kill();
    }

    connection.destroy();
    serverPlayers.delete(guildId);

    return message.reply("⏹️ Music stopped and bot disconnected.");
  }

  // --- COMMAND: !play ---
  if (message.content === "!play") {
    if (!hasAccess)
      return message.reply("❌ You do not have permission to use this bot!");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
      return message.reply("❌ You need to be in a voice channel first!");

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });
      // --- STAGE CHANNEL LOGIC START ---
      if (voiceChannel.type === ChannelType.GuildStageVoice) {
        let attempts = 0;

        // Check every second until discord.js cache updates
        const stageInterval = setInterval(async () => {
          attempts++;
          const botVoice = message.guild.members.me.voice;

          // Once discord.js confirms the bot is officially in the Stage channel
          if (botVoice.channel?.type === ChannelType.GuildStageVoice) {
            clearInterval(stageInterval); // Stop checking

            try {
              // Attempt to instantly become a speaker
              await botVoice.setSuppressed(false);
            } catch (error) {
              // If it lacks permissions, raise hand instead
              console.log(
                `[${message.guild.name}] Missing perms for instant speaker. Raising hand...`,
              );
              await botVoice.setRequestToSpeak(true).catch(() => {});
            }
          } else if (attempts >= 5) {
            // Give up after 5 seconds to prevent infinite loops if something glitches
            clearInterval(stageInterval);
          }
        }, 1000);
      }
      // --- STAGE CHANNEL LOGIC END ---
      // --- STAGE CHANNEL LOGIC END ---

      if (!serverPlayers.has(guildId)) {
        serverPlayers.set(guildId, {
          player: createAudioPlayer(),
          currentIndex: 0,
          currentPipeline: null,
        });
      }

      if (!serverPlayers.has(guildId)) {
        serverPlayers.set(guildId, {
          player: createAudioPlayer(),
          currentIndex: 0,
          currentPipeline: null,
        });
      }

      const serverData = serverPlayers.get(guildId);

      serverData.player.on("error", (error) => {
        console.error(
          `[${message.guild.name}] AudioPlayerError:`,
          error.message,
        );
        const playlist = getServerPlaylist(guildId);
        serverData.currentIndex =
          (serverData.currentIndex + 1) % playlist.length;
        setTimeout(playNextTrack, 2000);
      });

      const playNextTrack = async () => {
        try {
          const playlist = getServerPlaylist(guildId);
          if (playlist.length === 0) return;

          const url = playlist[serverData.currentIndex].trim();
          console.log(`[${message.guild.name}] Attempting to play: ${url}`);

          if (serverData.currentPipeline) {
            serverData.currentPipeline.kill();
          }

          const pipeline = createAudioPipeline(url);
          serverData.currentPipeline = pipeline;

          const resource = createAudioResource(pipeline.output, {
            inputType: StreamType.Raw,
          });
          serverData.player.play(resource);
        } catch (error) {
          console.error(
            `[${message.guild.name}] Stream extraction error:`,
            error.message,
          );
          const playlist = getServerPlaylist(guildId);
          serverData.currentIndex =
            (serverData.currentIndex + 1) % playlist.length;
          setTimeout(playNextTrack, 3000);
        }
      };

      playNextTrack();
      connection.subscribe(serverData.player);

      serverData.player.removeAllListeners(AudioPlayerStatus.Idle);

      serverData.player.on(AudioPlayerStatus.Idle, () => {
        const playlist = getServerPlaylist(guildId);
        serverData.currentIndex =
          (serverData.currentIndex + 1) % playlist.length;
        playNextTrack();
      });

      message.reply(
        `🎧 Playing server playlist! Loop enabled. Type \`!stop\` to disconnect.`,
      );
    } catch (error) {
      console.error(error);
      message.reply("❌ There was an error connecting to the voice channel.");
    }
  }
});

client.login(process.env.TOKEN1);
