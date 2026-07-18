require("dotenv").config();
const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CLIENT_ID = process.env.CLIENT_ID; // your bot's application/client ID

if (!TOKEN || !GUILD_ID || !CLIENT_ID) {
  console.error(
    "Missing required env vars. Check DISCORD_TOKEN, GUILD_ID, and CLIENT_ID in your .env file.",
  );
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("speak")
    .setDescription(
      "Make the bot join a voice channel and speak a message in Hindi",
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to speak aloud")
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription(
          "Voice channel to join (defaults to your current voice channel)",
        )
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false),
    )
    .toJSON(),
];

const rest = new REST().setToken(TOKEN);

(async () => {
  try {
    console.log("Registering /speak command...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log("Successfully registered /speak command for this guild.");
  } catch (err) {
    console.error("Failed to register command:", err);
  }
})();
