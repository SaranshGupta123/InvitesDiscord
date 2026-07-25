const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ChannelType,
  MessageFlags, // Added this to fix the warning
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
} = require("@discordjs/voice");
const fs = require("fs");

const config = require("./config.js");

// Load Whitelist Database
let whitelist = {};
if (fs.existsSync("./whitelist.json")) {
  whitelist = JSON.parse(fs.readFileSync("./whitelist.json"));
}

function saveWhitelist() {
  fs.writeFileSync("./whitelist.json", JSON.stringify(whitelist, null, 4));
}

// Permission checking logic
function isAuthorized(userId, guildId) {
  // Check if the user is inside the ownerIDs array
  if (config.ownerIDs.includes(userId)) return true; // Owners ALWAYS have access

  if (!whitelist[guildId]) return false;
  return whitelist[guildId].includes(userId);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Store active streams to manage 24/7 playback
const activeStreams = new Map();

const commands = [
  {
    name: "lofi",
    description: "Starts playing 24/7 Lofi music in your voice channel",
  },
  {
    name: "stop",
    description: "Stops the music and removes the bot from the channel",
  },
  {
    name: "grant",
    description: "Grant a user access to use this bot in this server",
    options: [
      {
        name: "user",
        type: 6,
        description: "The user to grant access to",
        required: true,
      },
    ],
  },
  {
    name: "revoke",
    description: "Revoke a user's access to use this bot in this server",
    options: [
      {
        name: "user",
        type: 6,
        description: "The user to revoke access from",
        required: true,
      },
    ],
  },
];

client.once("clientReady", async () => {
  console.log(`🎵 Logged in as ${client.user.tag}`);

  // Register slash commands globally
  const rest = new REST({ version: "10" }).setToken(config.token);
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log("Successfully registered slash commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
});

// Function to handle the 24/7 audio stream
// Function to handle the Playlist stream
function playLofi(guildId, voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });

  // NEW LOGIC: Keep track of which song is currently playing
  let currentIndex = 0;

  const startStream = () => {
    try {
      // Grab the current song from your config playlist
      const currentSong = config.playlist[currentIndex];
      console.log(`[${guildId}] Playing track ${currentIndex + 1} out of ${config.playlist.length}...`);
      
      const resource = createAudioResource(currentSong);
      player.play(resource);
    } catch (err) {
      console.error("Stream Error:", err.message);
    }
  };

  startStream();
  connection.subscribe(player);
  activeStreams.set(guildId, { connection, player });

  // STAGE LOGIC: Wait for the connection to be "Ready" before speaking
  connection.on(VoiceConnectionStatus.Ready, () => {
    if (voiceChannel.type === ChannelType.GuildStageVoice) {
      setTimeout(async () => {
        try {
          await voiceChannel.guild.members.me.voice.setSuppressed(false);
          console.log(`Successfully became a speaker in stage: ${voiceChannel.name}`);
        } catch (error) {
          console.log("Note: Could not automatically become a speaker in the stage channel.");
        }
      }, 1500);
    }
  });

  // PLAYLIST LOGIC: What to do when a song finishes playing
  player.on(AudioPlayerStatus.Idle, () => {
    console.log(`Track finished in ${guildId}. Moving to the next song...`);
    
    // Move to the next song in the list
    currentIndex++;

    // If we reached the end of the playlist, loop back to the beginning!
    if (currentIndex >= config.playlist.length) {
      currentIndex = 0; 
    }

    startStream(); 
  });

  player.on("error", (error) => {
    console.error(`Error in audio player for guild ${guildId}:`, error.message);
    
    // If a song errors out, skip to the next one
    currentIndex++;
    if (currentIndex >= config.playlist.length) currentIndex = 0;
    startStream();
  });
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, guildId, user } = interaction;

  // 1. SECURITY CHECK: Ensure user has access
  if (!isAuthorized(user.id, guildId)) {
    return interaction.reply({
      content:
        "❌ You do not have permission to control this bot in this server.",
      flags: MessageFlags.Ephemeral, // FIXED WARNING
    });
  }

  if (commandName === "lofi") {
    const member = await interaction.guild.members.fetch(user.id);
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "You need to be in a voice or stage channel first!",
        flags: MessageFlags.Ephemeral, // FIXED WARNING
      });
    }

    playLofi(guildId, voiceChannel);

    await interaction.reply({
      content: `🎧 Joined **${voiceChannel.name}** and starting 24/7 Lofi stream.`,
    });
  }

  if (commandName === "stop") {
    const streamInfo = activeStreams.get(guildId);
    if (streamInfo) {
      streamInfo.player.stop();
      streamInfo.connection.destroy();
      activeStreams.delete(guildId);
      await interaction.reply({
        content: "🛑 Stopped the music and left the channel.",
      });
    } else {
      await interaction.reply({
        content: "I am not currently playing anything in this server.",
        flags: MessageFlags.Ephemeral, // FIXED WARNING
      });
    }
  }

  if (commandName === "grant") {
    const targetUser = interaction.options.getUser("user");
    if (!whitelist[guildId]) whitelist[guildId] = [];

    if (!whitelist[guildId].includes(targetUser.id)) {
      whitelist[guildId].push(targetUser.id);
      saveWhitelist();
      await interaction.reply({
        content: `✅ Granted access to **${targetUser.tag}**. They can now use the bot in this server.`,
      });
    } else {
      await interaction.reply({
        content: `**${targetUser.tag}** already has access in this server.`,
        flags: MessageFlags.Ephemeral, // FIXED WARNING
      });
    }
  }

  if (commandName === "revoke") {
    const targetUser = interaction.options.getUser("user");

    // Prevent revoking any ID that is inside the ownerIDs array
    if (config.ownerIDs.includes(targetUser.id)) {
      return interaction.reply({
        content: "❌ You cannot revoke a bot owner's access!",
        flags: MessageFlags.Ephemeral, // FIXED WARNING
      });
    }

    if (whitelist[guildId] && whitelist[guildId].includes(targetUser.id)) {
      whitelist[guildId] = whitelist[guildId].filter(
        (id) => id !== targetUser.id,
      );
      saveWhitelist();
      await interaction.reply({
        content: `🚫 Revoked access from **${targetUser.tag}**.`,
      });
    } else {
      await interaction.reply({
        content: `**${targetUser.tag}** does not have access here.`,
        flags: MessageFlags.Ephemeral, // FIXED WARNING
      });
    }
  }
});

client.login(config.token);
