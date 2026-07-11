const { Events, EmbedBuilder } = require("discord.js");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const WELCOME_CHANNEL_ID = "YOUR_CHANNEL_ID_HERE";
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return console.log("Welcome channel not found!");

    // Replace these with channel IDs from your server
    const COLORS_CHANNEL = "1234567890";
    const RULES_CHANNEL = "1234567890";
    const CHAT_CHANNEL = "1234567890";
    const WUS_CHANNEL = "1234567890";

    const embed = new EmbedBuilder()
      .setColor("#00CFFF")
      .setAuthor({
        name: `Welcome To ISHQ 🌹`,
        iconURL: member.guild.iconURL({ dynamic: true }),
      })
      .setDescription(
        `<a:sparkle:1111111111111111111> **check these out !**\n` +
          `» <#${COLORS_CHANNEL}> • <#${RULES_CHANNEL}> <a:heart:2222222222222222222>\n` +
          `» <a:catvibe:3333333333333333333> • <#${CHAT_CHANNEL}> • <#${WUS_CHANNEL}>`,
      )
      .setImage("https://your-image-hosting-link.com/welcome-banner.gif")
      .setFooter({
        text: `ISHQ 🌹 India - Chilling Indian Community • Hindi • Active • desi (fun) • Vc • Indian discord server`,
        iconURL: member.guild.iconURL({ dynamic: true }),
      });

    try {
      await channel.send({ content: `${member}`, embeds: [embed] });
    } catch (err) {
      console.error("Failed to send welcome message:", err);
    }
  },
};
