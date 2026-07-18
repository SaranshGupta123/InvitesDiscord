const { PermissionFlagsBits, ChannelType } = require("discord.js");

module.exports = {
  name: "moverole",
  description:
    "Move all VC members with a specific role to another voice channel. Usage: !moverole @role #destination [#source]",

  async execute(message, args) {
    // Bot permission check
    const botMember = message.guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.MoveMembers)) {
      return message.reply('❌ I don\'t have the "Move Members" permission.');
    }

    // Parse role (mention or ID)
    const roleArg = args[0]?.replace(/[<@&>]/g, "");
    const role = roleArg ? message.guild.roles.cache.get(roleArg) : null;
    if (!role) {
      return message.reply(
        "❌ Please mention a valid role, e.g. `!moverole @role #destination`",
      );
    }

    // Parse destination channel (mention or ID)
    const destArg = args[1]?.replace(/[<#>]/g, "");
    const destination = destArg
      ? message.guild.channels.cache.get(destArg)
      : null;
    if (!destination || destination.type !== ChannelType.GuildVoice) {
      return message.reply(
        "❌ Please mention a valid voice channel for the destination.",
      );
    }

    // Optional source channel
    let source = null;
    if (args[2]) {
      const sourceArg = args[2].replace(/[<#>]/g, "");
      source = message.guild.channels.cache.get(sourceArg);
      if (!source || source.type !== ChannelType.GuildVoice) {
        return message.reply(
          "❌ Source channel must be a valid voice channel.",
        );
      }
    }

    const guild = message.guild;
    const channels = source
      ? [source]
      : guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice);

    let moved = [];
    let failed = [];

    const channelList = source ? [source] : [...channels.values()];

    for (const channel of channelList) {
      if (!channel || channel.type !== ChannelType.GuildVoice) continue;
      if (channel.id === destination.id) continue;

      for (const [, member] of channel.members) {
        if (member.roles.cache.has(role.id)) {
          try {
            await member.voice.setChannel(destination);
            moved.push(member.user.tag);
          } catch (err) {
            failed.push(member.user.tag);
          }
        }
      }
    }

    if (moved.length === 0 && failed.length === 0) {
      return message.reply(
        `No members with role **${role.name}** found in voice channels${source ? ` in ${source.name}` : ""}.`,
      );
    }

    let reply = `✅ Moved **${moved.length}** member(s) with role **${role.name}** to **${destination.name}**.`;
    if (failed.length > 0) {
      reply += `\n⚠️ Failed to move: ${failed.join(", ")}`;
    }

    await message.reply(reply);
  },
};
