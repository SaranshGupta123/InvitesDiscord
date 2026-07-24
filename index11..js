const {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
} = require("discord.js");
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const fs = require("fs");
const play = require("play-dl");

const USERS_FILE = "./server_users.json";
const PLAYLISTS_FILE = "./server_playlists.json";

const GLOBAL_ADMINS = ["1355201526716694590", "482137869251772427"];
const serverPlayers = new Map();

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

// ✅ FIXED: These links are now 100% clean!
// ✅ FIXED: Cleaned the link so it is just the video!
function getServerPlaylist(guildId) {
  const data = readJSON(PLAYLISTS_FILE);
  return (
    data[guildId] || [
      "https://www.youtube.com/watch?v=kyqpSycLASY", // <-- Notice there is NO "&list=" here!
    ]
  );
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
  console.log("Commands: !play | !stop | !add @user | !addsong <link>");
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

  // --- COMMAND: !addsong <youtube_link> ---
  if (message.content.startsWith("!addsong ")) {
    if (!hasAccess)
      return message.reply("❌ You do not have permission to add songs!");

    const url = message.content.split(" ")[1];
    if (!url || (!url.includes("youtube.com") && !url.includes("youtu.be"))) {
      return message.reply("❌ Please provide a valid YouTube link.");
    }

    let allPlaylists = readJSON(PLAYLISTS_FILE);
    if (!allPlaylists[guildId])
      allPlaylists[guildId] = getServerPlaylist(guildId);

    allPlaylists[guildId].push(url);
    writeJSON(PLAYLISTS_FILE, allPlaylists);

    return message.reply(
      `✅ Added song to THIS server's playlist! Total songs: **${allPlaylists[guildId].length}**`,
    );
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

    connection.destroy();
    if (serverPlayers.has(guildId)) serverPlayers.delete(guildId);

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

      if (!serverPlayers.has(guildId)) {
        serverPlayers.set(guildId, {
          player: createAudioPlayer(),
          currentIndex: 0,
        });
      }

      const serverData = serverPlayers.get(guildId);

      const playNextTrack = async () => {
        try {
          const playlist = getServerPlaylist(guildId);
          if (playlist.length === 0) return;

          const url = playlist[serverData.currentIndex];
          console.log(`[${message.guild.name}] Attempting to play: ${url}`);

          const stream = await play.stream(url);
          const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
          });
          serverData.player.play(resource);
        } catch (error) {
          console.error("Error playing video:", error.message);
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

// PASTE YOUR TOKEN HERE
// client.login(
//   "something",
// );
