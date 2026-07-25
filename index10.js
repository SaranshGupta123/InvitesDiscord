const {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
  ChannelType,
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
const crypto = require("crypto");
require("dotenv").config();

const USERS_FILE = "./server_users.json";
const PLAYLISTS_FILE = "./server_playlists.json";

const GLOBAL_ADMINS = [
  "1355201526716694590",
  "482137869251772427",
  "1006057554528444516",
];
const serverPlayers = new Map();

// --- Locate yt-dlp: prefer a copy sitting next to this script, else fall back to PATH ---
// const LOCAL_YTDLP = path.join(__dirname, "yt-dlp.exe");
// const YTDLP_CMD = fs.existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : "yt-dlp";
const YTDLP_CMD = "yt-dlp";

const COOKIES_PATH = path.join(__dirname, "cookies.txt");
const CACHE_DIR = path.join(__dirname, "audio_cache");

// Optional. Only needed if this host's IP ends up blocked by YouTube even
// with a cached-download approach. Must be a residential/ISP/mobile proxy —
// datacenter proxies get blocked the same way the host's own IP does.
// Example: YTDLP_PROXY=http://user:pass@proxy-host:port
const YTDLP_PROXY = process.env.YTDLP_PROXY || process.env.PROXY_URL || "";

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

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

// ============================================================================
// LOCAL AUDIO CACHE
//
// The old version re-ran yt-dlp against YouTube on every single loop of
// every track, forever. That's a lot of automated requests from a cloud/
// datacenter IP, which is exactly the pattern YouTube's "sign in to confirm
// you're not a bot" check is built to catch — cookies don't reliably fix
// that, because the block is usually on the IP, not the session.
//
// Here, each track is fetched from YouTube ONCE (when it's added, or the
// first time it's due to play) and saved to disk. Every later play of that
// same track is a local file read — no YouTube request, no cookies, no
// bot-check involved at all. This also means if/when a fetch *does* need a
// proxy, it's only spent once per song, not continuously.
// ============================================================================

function extractVideoId(url) {
  const match = url.match(
    /(?:v=|\/live\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (match) return match[1];
  // Fallback for URL shapes we don't recognize: still a stable, safe cache key
  return crypto.createHash("md5").update(url).digest("hex");
}

function findCachedFile(id) {
  if (!fs.existsSync(CACHE_DIR)) return null;
  const match = fs.readdirSync(CACHE_DIR).find((f) => {
    if (!f.startsWith(`${id}.`)) return false;
    const ext = path.extname(f).toLowerCase();
    // Ignore leftovers from an interrupted download
    return ext !== ".part" && ext !== ".ytdl" && ext !== ".tmp";
  });
  return match ? path.join(CACHE_DIR, match) : null;
}

const inFlightDownloads = new Map();

function downloadToCache(url, id) {
  return new Promise((resolve, reject) => {
    const outputTemplate = path.join(CACHE_DIR, `${id}.%(ext)s`);
    const args = [];

    if (fs.existsSync(COOKIES_PATH)) {
      args.push("--cookies", COOKIES_PATH);
    }
    if (YTDLP_PROXY) {
      args.push("--proxy", YTDLP_PROXY);
    }

    args.push(
      "--extractor-args",
      "youtube:player_client=android_vr,web_embedded,tv",
      "-f",
      "bestaudio",
      "-o",
      outputTemplate,
      "--no-playlist",
      "--no-warnings",
      url,
    );

    console.log(`[cache] Fetching "${id}"...`);
    const ytdlp = spawn(YTDLP_CMD, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    ytdlp.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    ytdlp.on("error", (err) => {
      reject(
        new Error(
          `yt-dlp failed to start (${YTDLP_CMD}): ${err.message}` +
            (err.code === "ENOENT" ? " -> yt-dlp not found on PATH." : ""),
        ),
      );
    });

    ytdlp.on("close", (code) => {
      const file = findCachedFile(id);
      if (code === 0 && file) {
        console.log(`[cache] Cached "${id}" -> ${path.basename(file)}`);
        return resolve(file);
      }
      const blocked = /sign in to confirm|not a bot/i.test(stderr);
      reject(
        new Error(
          blocked
            ? `YouTube blocked this fetch (bot check) — set YTDLP_PROXY to a residential/ISP proxy, or install the yt-dlp-invidious plugin as a fallback`
            : `yt-dlp exited ${code}: ${stderr.trim().split("\n").pop() || "unknown error"}`,
        ),
      );
    });
  });
}

// De-dupes concurrent requests for the same track (e.g. two guilds sharing a
// song at the same moment) so we never run two downloads into one filename.
function ensureCached(url) {
  const id = extractVideoId(url);
  const cached = findCachedFile(id);
  if (cached) return Promise.resolve(cached);

  if (inFlightDownloads.has(id)) return inFlightDownloads.get(id);

  const promise = downloadToCache(url, id).finally(() =>
    inFlightDownloads.delete(id),
  );
  inFlightDownloads.set(id, promise);
  return promise;
}

// ffmpeg now reads an already-downloaded file straight off disk and converts
// it to raw PCM — no live network stream involved in playback at all, so
// there's nothing left for YouTube to interrupt mid-song.
function createPlaybackPipeline(filepath) {
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-i",
      filepath,
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
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  ffmpeg.on("error", (err) => {
    console.error("[ffmpeg] Failed to start:", err.message);
  });
  ffmpeg.stderr.on("data", (chunk) => {
    console.error(`[ffmpeg stderr] ${chunk.toString().trim()}`);
  });

  return {
    output: ffmpeg.stdout,
    kill: () => ffmpeg.kill(),
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
  console.log(`Audio cache directory: ${CACHE_DIR}`);
  console.log(
    YTDLP_PROXY
      ? `Fetches will use proxy: ${YTDLP_PROXY.replace(/:\/\/.*@/, "://***@")}`
      : "No proxy configured (set YTDLP_PROXY in .env if a fetch ever gets blocked)",
  );
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

    // Warm the cache in the background so playback never has to wait on (or
    // fail because of) a live YouTube fetch once the loop reaches this song.
    for (const url of validUrls) {
      ensureCached(url).catch((err) =>
        console.error(`[cache] Pre-fetch failed for ${url}: ${err.message}`),
      );
    }

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

      // --- STAGE CHANNEL LOGIC ---
      if (voiceChannel.type === ChannelType.GuildStageVoice) {
        let attempts = 0;

        // Check every second until discord.js cache updates
        const stageInterval = setInterval(async () => {
          attempts++;
          const botVoice = message.guild.members.me.voice;

          // Once discord.js confirms the bot is officially in the Stage channel
          if (botVoice.channel?.type === ChannelType.GuildStageVoice) {
            clearInterval(stageInterval);

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
        const playlist = getServerPlaylist(guildId);
        if (playlist.length === 0) return;

        const url = playlist[serverData.currentIndex].trim();
        console.log(`[${message.guild.name}] Attempting to play: ${url}`);

        try {
          // Cache hit -> instant, local, no YouTube involved.
          // Cache miss -> fetched once here, then cached for every future loop.
          const filepath = await ensureCached(url);

          if (serverData.currentPipeline) {
            serverData.currentPipeline.kill();
          }

          const pipeline = createPlaybackPipeline(filepath);
          serverData.currentPipeline = pipeline;

          const resource = createAudioResource(pipeline.output, {
            inputType: StreamType.Raw,
          });
          serverData.player.play(resource);
        } catch (error) {
          console.error(
            `[${message.guild.name}] Skipping "${url}": ${error.message}`,
          );
          const freshPlaylist = getServerPlaylist(guildId);
          serverData.currentIndex =
            (serverData.currentIndex + 1) % freshPlaylist.length;
          setTimeout(playNextTrack, 1500);
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
