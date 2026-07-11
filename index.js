require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  EmbedBuilder,
} = require("discord.js");

// --- CONFIGURATION ---
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_IDS = [process.env.ROLE_ID_1, process.env.ROLE_ID_2]; // both roles to grant
const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID; // where the embed gets posted
const VANITY_TEXT = ".gg/baddiecafeindia"; // The text to look for

// GIFs shown on the removal embed (pick a few, one is chosen at random each time)
const REMOVE_GIFS = [
  "https://media.tenor.com/2ND1sB5D4A0AAAAC/bye-bye.gif",
  "https://media.tenor.com/6oj4gwvLdKcAAAAC/goodbye-bye.gif",
  "https://media.tenor.com/6H_JsvzE-p4AAAAC/sad-bye.gif",
];
// ---------------------

if (!TOKEN || !GUILD_ID || !ANNOUNCE_CHANNEL_ID || ROLE_IDS.some((r) => !r)) {
  console.error(
    "Missing required env vars. Check DISCORD_TOKEN, GUILD_ID, ROLE_ID_1, ROLE_ID_2, ANNOUNCE_CHANNEL_ID in your .env file.",
  );
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences, // Required to read custom statuses
    GatewayIntentBits.GuildMessages, // Required to read messages
    GatewayIntentBits.MessageContent, // Required to read the content of messages
  ],
});

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}! Ready to check statuses.`);
});

// --- NEW MESSAGE LISTENER FOR VANITY COMMAND ---
client.on("messageCreate", async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if the user typed '!vanity' or 'vanity'
  const msgContent = message.content.toLowerCase().trim();
  if (msgContent === "!vanity" || msgContent === "vanity") {
    // Create a cute embed for the reply
    const vanityEmbed = new EmbedBuilder()
      .setColor(0xff5cad)
      .setTitle("✨ Baddie Cafe Vanity ✨")
      .setDescription(
        `Rep the cafe and get exclusive perks! 🍒\n\nPut \`${VANITY_TEXT}\` in your custom status to get verified.`,
      )
      .setFooter({ text: "We appreciate the support 💖" });

    await message.reply({ embeds: [vanityEmbed] });
  }
});
// -----------------------------------------------

async function announceVanity(member, roles) {
  try {
    const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.log("Announce channel not found or not text-based.");
      return;
    }

    const roleMentions = roles.map((r) => `<@&${r.id}>`).join(" and ");

    const embed = new EmbedBuilder()
      .setColor(0xff5cad) // baddie pink
      .setAuthor({
        name: "Baddie Cafe India 🎀",
        iconURL: member.guild.iconURL() || undefined,
      })
      .setTitle("✨ New Baddie Verified! ✨")
      .setDescription(
        `Thanks for repping **Baddie Cafe** by putting \`${VANITY_TEXT}\` in your status, ${member}!\n\nYou've been granted ${roleMentions} 💖`,
      )
      .setThumbnail(member.displayAvatarURL({ size: 256 }))
      .addFields({
        name: "How to keep your perks",
        value: "Just keep the link in your custom status — that's it! 🍒",
      })
      .setFooter({ text: "We appreciate the support ✨" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Failed to send announcement embed:", err);
  }
}

async function announceRemoval(member, roles) {
  try {
    const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.log("Announce channel not found or not text-based.");
      return;
    }

    const roleMentions = roles.map((r) => `<@&${r.id}>`).join(" and ");
    const gif = REMOVE_GIFS[Math.floor(Math.random() * REMOVE_GIFS.length)];

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31) // muted dark, contrast against the pink "verified" embed
      .setAuthor({
        name: "Baddie Cafe India 🎀",
        iconURL: member.guild.iconURL() || undefined,
      })
      .setTitle("💔 Baddie Perks Removed")
      .setDescription(
        `${member} removed \`${VANITY_TEXT}\` from their status, so ${roleMentions} ${roles.length > 1 ? "have" : "has"} been taken back.`,
      )
      .setThumbnail(member.displayAvatarURL({ size: 256 }))
      .addFields({
        name: "Want your perks back?",
        value: "Just add the link to your status again anytime! 🍒",
      })
      .setImage(gif)
      .setFooter({ text: "We'll miss you 🥲" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Failed to send removal embed:", err);
  }
}

client.on("presenceUpdate", (oldPresence, newPresence) => {
  // Only run for the specific server
  if (!newPresence.guild || newPresence.guild.id !== GUILD_ID) return;

  // Ignore the event if the user is going offline/invisible
  if (newPresence.status === "offline") return;

  const member = newPresence.member;
  if (!member) return;

  // Resolve both roles from the server, skip any that don't exist
  const roles = ROLE_IDS.map((id) =>
    newPresence.guild.roles.cache.get(id),
  ).filter(Boolean);

  if (roles.length === 0) {
    console.log("Neither role was found! Check your ROLE_ID_1 / ROLE_ID_2.");
    return;
  }
  if (roles.length < ROLE_IDS.length) {
    console.log(
      "Warning: one of the configured role IDs was not found on this server.",
    );
  }

  // Check user's current activities for a custom status
  let hasVanity = false;
  const activities = newPresence.activities;

  for (const activity of activities) {
    // ActivityType.Custom is 4
    if (activity.type === ActivityType.Custom) {
      // activity.state holds the text of the custom status
      if (activity.state && activity.state.includes(VANITY_TEXT)) {
        hasVanity = true;
      }
    }
  }

  // Track whether the member was missing at least one role before this update
  const wasMissingSomeRole = roles.some(
    (role) => !member.roles.cache.has(role.id),
  );
  // Track whether the member had at least one of the roles before this update
  const hadSomeRole = roles.some((role) => member.roles.cache.has(role.id));

  // Assign or remove both roles based on the status
  for (const role of roles) {
    const hasRole = member.roles.cache.has(role.id);

    if (hasVanity && !hasRole) {
      member.roles
        .add(role)
        .then(() =>
          console.log(`Gave role "${role.name}" to ${member.user.tag}`),
        )
        .catch(console.error);
    } else if (!hasVanity && hasRole) {
      member.roles
        .remove(role)
        .then(() =>
          console.log(`Removed role "${role.name}" from ${member.user.tag}`),
        )
        .catch(console.error);
    }
  }

  // Only announce when the member is newly gaining the roles (not on every presence update)
  if (hasVanity && wasMissingSomeRole) {
    announceVanity(member, roles);
  } else if (!hasVanity && hadSomeRole) {
    announceRemoval(member, roles);
  }
});

client.login(TOKEN);
