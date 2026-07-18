/**
 * music.js — Music player module (drop-in addon for the combined bot)
 * ---------------------------------------------------------------------
 * Built on `discord-player`, which manages voice connections, per-guild
 * queues, and audio extraction so this file only has to wire up
 * commands + a few events.
 *
 * INSTALL (run in your bot's project folder):
 *   npm install discord-player @discord-player/extractor play-dl mediaplex
 *
 * `mediaplex` gives discord-player a bundled ffmpeg/opus encoder so you
 * don't need ffmpeg installed separately. `play-dl` is registered as the
 * extractor for YouTube search/streaming.
 *
 * INTEGRATION (in your main index.js):
 *
 *   const {
 *     musicCommands,
 *     initMusicPlayer,
 *     handleMusicInteraction,
 *   } = require("./music.js");
 *
 *   // 1. Add musicCommands to your `commands` array before mapping to JSON:
 *   const commands = [
 *     ...existingCommandBuilders,
 *     ...musicCommands,
 *   ].map((c) => c.toJSON());
 *
 *   // 2. Initialize the player once the client is ready (inside your
 *   //    `client.once("clientReady", ...)` block, anywhere after `client` exists):
 *   await initMusicPlayer(client);
 *
 *   // 3. In your interactionCreate handler, near the top of the try block,
 *   //    add a dispatch to the music handler for the /music command:
 *   if (interaction.isChatInputCommand() && interaction.commandName === "music") {
 *     return handleMusicInteraction(interaction);
 *   }
 *
 * That's it — everything else (voice joining, queueing, track search,
 * playback, disconnect-on-empty) lives in this file.
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { Player, QueryType } = require("discord-player");
const {
  DefaultExtractors,
  YoutubeiExtractor,
} = require("@discord-player/extractor");

let player = null;

// ---------------------------------------------------------------------
// Permission gate — reuses the same env-driven allow-list pattern as
// the rest of the bot so behavior stays consistent. Empty allow-lists
// mean "open to everyone" just like the giveaway commands.
// ---------------------------------------------------------------------
const MUSIC_ALLOWED_ROLE_IDS = (process.env.MUSIC_ALLOWED_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MUSIC_ALLOWED_USER_IDS = (process.env.MUSIC_ALLOWED_USER_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function hasMusicPermission(interaction) {
  const member = interaction.member;
  if (!member) return false;

  if (member.permissions?.has?.("Administrator")) return true;
  if (interaction.guild?.ownerId === interaction.user.id) return true;
  if (MUSIC_ALLOWED_USER_IDS.includes(interaction.user.id)) return true;

  const roleCache = member.roles?.cache;
  if (
    MUSIC_ALLOWED_ROLE_IDS.length > 0 &&
    roleCache &&
    roleCache.some((r) => MUSIC_ALLOWED_ROLE_IDS.includes(r.id))
  ) {
    return true;
  }

  if (
    MUSIC_ALLOWED_ROLE_IDS.length === 0 &&
    MUSIC_ALLOWED_USER_IDS.length === 0
  ) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------
// Slash command definition — one parent command with subcommands, to
// keep it from cluttering the top-level command list next to
// /giveaway, /invites, etc.
// ---------------------------------------------------------------------
const musicCommands = [
  new SlashCommandBuilder()
    .setName("music")
    .setDescription("Music playback controls")
    .addSubcommand((sub) =>
      sub
        .setName("play")
        .setDescription("Play a song or add it to the queue")
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription("Song name, artist, or a YouTube/Spotify URL")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("skip").setDescription("Skip the current track"),
    )
    .addSubcommand((sub) =>
      sub.setName("stop").setDescription("Stop playback and clear the queue"),
    )
    .addSubcommand((sub) =>
      sub.setName("pause").setDescription("Pause the current track"),
    )
    .addSubcommand((sub) =>
      sub.setName("resume").setDescription("Resume playback"),
    )
    .addSubcommand((sub) =>
      sub.setName("queue").setDescription("Show the current queue"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("nowplaying")
        .setDescription("Show the currently playing track"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("volume")
        .setDescription("Set playback volume (0-100)")
        .addIntegerOption((opt) =>
          opt
            .setName("level")
            .setDescription("Volume percentage")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(100),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("loop")
        .setDescription("Set loop mode")
        .addStringOption((opt) =>
          opt
            .setName("mode")
            .setDescription("Loop mode")
            .setRequired(true)
            .addChoices(
              { name: "Off", value: "off" },
              { name: "Track", value: "track" },
              { name: "Queue", value: "queue" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("shuffle").setDescription("Shuffle the queue"),
    )
    .addSubcommand((sub) =>
      sub.setName("leave").setDescription("Disconnect from voice channel"),
    ),
];

// ---------------------------------------------------------------------
// Player setup — call once from your ready handler.
// ---------------------------------------------------------------------
async function initMusicPlayer(client) {
  player = new Player(client, {
    skipFFmpeg: false,
  });

  // Registers YouTube (and a few others) as searchable/streamable sources.
  // If you have Spotify creds you can register @discord-player/extractor's
  // SpotifyExtractor too — YouTube alone covers Spotify links via title
  // matching through YoutubeiExtractor's fallback resolution.
await player.extractors.loadMulti(DefaultExtractors);

// Explicitly load YouTube extractor if it wasn't loaded
if (!player.extractors.get("com.discord-player.youtubei")) {
  await player.extractors.register(YoutubeiExtractor, {});
}

  player.events.on("playerStart", (queue, track) => {
    const channel = queue.metadata?.textChannel;
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setTitle("🎶 Now Playing")
      .setDescription(`**${track.title}**\nby ${track.author}`)
      .setThumbnail(track.thumbnail)
      .setColor(0x1db954)
      .setFooter({
        text: `Requested by ${track.requestedBy?.username || "unknown"}`,
      });
    channel.send({ embeds: [embed] }).catch(() => {});
  });

  player.events.on("emptyQueue", (queue) => {
    const channel = queue.metadata?.textChannel;
    if (channel)
      channel.send("📭 Queue finished — leaving it here.").catch(() => {});
  });

  player.events.on("disconnect", (queue) => {
    const channel = queue.metadata?.textChannel;
    if (channel)
      channel.send("👋 Disconnected from the voice channel.").catch(() => {});
  });

  player.events.on("error", (queue, error) => {
    console.error("Music player error:", error);
    const channel = queue.metadata?.textChannel;
    if (channel)
      channel.send("❌ Something went wrong with playback.").catch(() => {});
  });

  player.events.on("playerError", (queue, error) => {
    console.error("Music playback error:", error);
    const channel = queue.metadata?.textChannel;
    if (channel)
      channel.send("❌ Playback error — skipping this track.").catch(() => {});
  });

  console.log("🎵 Music player initialized.");
  return player;
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------
// Interaction dispatch — call from your interactionCreate handler for
// interaction.commandName === "music".
// ---------------------------------------------------------------------
async function handleMusicInteraction(interaction) {
  if (!player) {
    return interaction.reply({
      content: "❌ Music player is not initialized yet — try again shortly.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!hasMusicPermission(interaction)) {
    return interaction.reply({
      content: "🚫 You do not have permission to control music playback.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const sub = interaction.options.getSubcommand();
  const voiceChannel = interaction.member?.voice?.channel;

  // Subcommands that need the user to already be in a voice channel
  const needsVoice = ["play"];
  if (needsVoice.includes(sub) && !voiceChannel) {
    return interaction.reply({
      content: "⚠️ Join a voice channel first so I know where to play music.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const existingQueue = player.nodes.get(interaction.guildId);

  try {
    if (sub === "play") {
      await interaction.deferReply();
      const query = interaction.options.getString("query", true);

    let searchResult;

    try {
      const isYouTubeUrl =
        query.includes("youtube.com/") || query.includes("youtu.be/");

      const isSpotifyUrl = query.includes("open.spotify.com/");

      if (isYouTubeUrl) {
        // Let the registered YouTube extractor directly handle
        // videos, playlists and radio/mix URLs.
        searchResult = await player.search(query, {
          requestedBy: interaction.user,
          searchEngine: QueryType.AUTO,
        });
      } else if (isSpotifyUrl) {
        searchResult = await player.search(query, {
          requestedBy: interaction.user,
          searchEngine: QueryType.AUTO,
        });
      } else {
        // Plain text song search
        searchResult = await player.search(query, {
          requestedBy: interaction.user,
          searchEngine: QueryType.YOUTUBE_SEARCH,
        });
      }
    } catch (error) {
      console.error("Music search error:", error);

      return interaction.editReply(
        "❌ Failed to search this link. Check the bot console for the extractor error.",
      );
    }

    console.log("Music query:", query);
    console.log("Tracks found:", searchResult?.tracks?.length || 0);
    console.log(
      "Playlist:",
      searchResult?.playlist?.title || "No playlist detected",
    );

    if (!searchResult || !searchResult.hasTracks()) {
      return interaction.editReply(
        `❌ No playable tracks found.\n\nTry:\n` +
          `• A normal YouTube video link\n` +
          `• A public YouTube playlist link\n` +
          `• A song name like \`Perfect Ed Sheeran\``,
      );
    }

      const queue = player.nodes.create(interaction.guild, {
        metadata: { textChannel: interaction.channel, voiceChannel },
        selfDeaf: true,
        volume: 80,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 60_000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 300_000,
      });

      try {
        if (!queue.connection) await queue.connect(voiceChannel);
      } catch {
        player.nodes.delete(interaction.guildId);
        return interaction.editReply(
          "❌ Could not join your voice channel — check my permissions.",
        );
      }

      if (searchResult.playlist) {
        queue.addTrack(searchResult.tracks);
        await interaction.editReply(
          `✅ Queued playlist **${searchResult.playlist.title}** (${searchResult.tracks.length} tracks).`,
        );
      } else {
        const track = searchResult.tracks[0];
        queue.addTrack(track);
        await interaction.editReply(`✅ Queued **${track.title}**.`);
      }

      if (!queue.isPlaying()) await queue.node.play();
      return;
    }

    // Everything below requires an active queue
    if (!existingQueue || !existingQueue.currentTrack) {
      return interaction.reply({
        content: "❌ Nothing is playing right now.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === "skip") {
      const skipped = existingQueue.currentTrack;
      existingQueue.node.skip();
      return interaction.reply(`⏭️ Skipped **${skipped.title}**.`);
    }

    if (sub === "stop") {
      existingQueue.delete();
      return interaction.reply("⏹️ Stopped playback and cleared the queue.");
    }

    if (sub === "pause") {
      existingQueue.node.setPaused(true);
      return interaction.reply("⏸️ Paused.");
    }

    if (sub === "resume") {
      existingQueue.node.setPaused(false);
      return interaction.reply("▶️ Resumed.");
    }

    if (sub === "queue") {
      const tracks = existingQueue.tracks.toArray();
      const current = existingQueue.currentTrack;
      const lines = tracks
        .slice(0, 10)
        .map((t, i) => `**${i + 1}.** ${t.title} — ${t.duration}`);

      const embed = new EmbedBuilder()
        .setTitle("🎵 Queue")
        .setDescription(
          `**Now Playing:** ${current.title} — ${current.duration}\n\n` +
            (lines.length ? lines.join("\n") : "*Queue is empty.*") +
            (tracks.length > 10 ? `\n...and ${tracks.length - 10} more` : ""),
        )
        .setColor(0x1db954);

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "nowplaying") {
      const track = existingQueue.currentTrack;
      const progress = existingQueue.node.getTimestamp();
      const embed = new EmbedBuilder()
        .setTitle("🎶 Now Playing")
        .setDescription(`**${track.title}**\nby ${track.author}`)
        .setThumbnail(track.thumbnail)
        .addFields({
          name: "Progress",
          value: progress
            ? `${progress.current.label} / ${progress.total.label}`
            : formatDuration(0),
        })
        .setColor(0x1db954);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "volume") {
      const level = interaction.options.getInteger("level", true);
      existingQueue.node.setVolume(level);
      return interaction.reply(`🔊 Volume set to **${level}%**.`);
    }

    if (sub === "loop") {
      const mode = interaction.options.getString("mode", true);
      const modeMap = { off: 0, track: 1, queue: 2 };
      existingQueue.setRepeatMode(modeMap[mode]);
      return interaction.reply(`🔁 Loop mode set to **${mode}**.`);
    }

    if (sub === "shuffle") {
      existingQueue.tracks.shuffle();
      return interaction.reply("🔀 Queue shuffled.");
    }

    if (sub === "leave") {
      existingQueue.delete();
      return interaction.reply("👋 Left the voice channel.");
    }
  } catch (err) {
    console.error("Music command error:", err);
    const payload = { content: "❌ Something went wrong with that command." };
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(payload).catch(() => {});
    }
    return interaction
      .reply({ ...payload, flags: MessageFlags.Ephemeral })
      .catch(() => {});
  }
}

module.exports = {
  musicCommands,
  initMusicPlayer,
  handleMusicInteraction,
};
