/**
 * server-logs.js
 * ------------------------------------------------------------
 * Drop-in server activity logger. Covers:
 *   - Roles created / deleted / updated
 *   - Channels created / deleted / updated
 *   - Members joining / leaving the server
 *   - Members joining / leaving / moving voice channels
 *   - Profile changes: nickname, roles added/removed, avatar, username
 *   - Bans / unbans
 *   - Invites created / deleted
 *
 * Each category posts to its OWN channel (set via .env, see bottom of
 * this file for the full list of env vars). Discord events don't tell
 * you WHO did role/channel/ban changes, so this module cross-checks
 * the guild's Audit Log right after each event fires.
 *
 * SETUP:
 *   1. In your server, create one text channel per category below
 *      (or reuse channels — up to you).
 *   2. On each channel: Channel Settings → Permissions → remove
 *      @everyone's "View Channel", then add "View Channel" only for
 *      your Administrator/mod role(s). This is what makes them
 *      admin-only — the bot can't enforce Discord permissions from
 *      code, this is a one-time manual step per channel.
 *   3. Copy each channel's ID into your .env (see bottom of file).
 *   4. In your main bot file, near the top:
 *        const { registerServerLogs } = require("./server-logs");
 *      and right after `client.login(...)` (or anywhere after the
 *      client is created), call:
 *        registerServerLogs(client);
 *   5. Make sure your bot's intents include:
 *        GatewayIntentBits.Guilds,
 *        GatewayIntentBits.GuildMembers,
 *        GatewayIntentBits.GuildModeration,   // bans
 *        GatewayIntentBits.GuildVoiceStates,
 *        GatewayIntentBits.GuildInvites,
 *      (your existing bot already has most of these)
 *   6. The bot's role needs "View Audit Log" permission, or the
 *      "who did it" fields will just say "Unknown".
 */

const { EmbedBuilder, AuditLogEvent, ChannelType } = require("discord.js");

// ---- channel routing (one env var per category) ----
const CHANNELS = {
  roles: process.env.LOG_CHANNEL_ROLES,
  channels: process.env.LOG_CHANNEL_CHANNELS,
  members: process.env.LOG_CHANNEL_MEMBERS,
  voice: process.env.LOG_CHANNEL_VOICE,
  profile: process.env.LOG_CHANNEL_PROFILE,
  bans: process.env.LOG_CHANNEL_BANS,
  invites: process.env.LOG_CHANNEL_INVITES,
};

const COLORS = {
  create: 0x57f287,
  delete: 0xed4245,
  update: 0xfee75c,
  join: 0x5865f2,
  leave: 0x99aab5,
  ban: 0xed4245,
  unban: 0x57f287,
};

async function sendLog(client, category, embed) {
  const channelId = CHANNELS[category];
  if (!channelId) return; // not configured — silently skip
  try {
    const channel =
      client.channels.cache.get(channelId) ||
      (await client.channels.fetch(channelId).catch(() => null));
    if (!channel || !channel.isTextBased()) return;
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`[server-logs] Failed to send to ${category} channel:`, err);
  }
}

// Finds the most recent matching audit log entry (within 5s) so we know
// WHO performed an action Discord's own event doesn't attribute.
async function getAuditActor(guild, actionType, targetId = null) {
  try {
    const logs = await guild.fetchAuditLogs({ type: actionType, limit: 5 });
    const entry = logs.entries.find((e) => {
      const recent = Date.now() - e.createdTimestamp < 5000;
      const matchesTarget =
        !targetId || e.targetId === targetId || e.target?.id === targetId;
      return recent && matchesTarget;
    });
    return entry?.executor ?? null;
  } catch {
    return null; // missing permission, or nothing found
  }
}

function actorField(executor) {
  return executor
    ? `${executor} (${executor.tag})`
    : "Unknown (check bot's View Audit Log permission)";
}

function registerServerLogs(client) {
  // ================= ROLES =================
  client.on("roleCreate", async (role) => {
    const actor = await getAuditActor(
      role.guild,
      AuditLogEvent.RoleCreate,
      role.id,
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.create)
      .setTitle("➕ Role Created")
      .addFields(
        { name: "Role", value: `${role} (\`${role.name}\`)` },
        { name: "Created by", value: actorField(actor) },
      )
      .setTimestamp();
    sendLog(client, "roles", embed);
  });

  client.on("roleDelete", async (role) => {
    const actor = await getAuditActor(
      role.guild,
      AuditLogEvent.RoleDelete,
      role.id,
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.delete)
      .setTitle("➖ Role Deleted")
      .addFields(
        { name: "Role", value: `\`${role.name}\` (${role.id})` },
        { name: "Deleted by", value: actorField(actor) },
      )
      .setTimestamp();
    sendLog(client, "roles", embed);
  });

  client.on("roleUpdate", async (oldRole, newRole) => {
    const changes = [];
    if (oldRole.name !== newRole.name)
      changes.push(`Name: \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.color !== newRole.color)
      changes.push(
        `Color: \`#${oldRole.color.toString(16)}\` → \`#${newRole.color.toString(16)}\``,
      );
    if (oldRole.hoist !== newRole.hoist)
      changes.push(`Hoisted: ${oldRole.hoist} → ${newRole.hoist}`);
    if (oldRole.mentionable !== newRole.mentionable)
      changes.push(
        `Mentionable: ${oldRole.mentionable} → ${newRole.mentionable}`,
      );
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield)
      changes.push("Permissions changed");
    if (changes.length === 0) return; // e.g. position-only shuffle, skip noise

    const actor = await getAuditActor(
      newRole.guild,
      AuditLogEvent.RoleUpdate,
      newRole.id,
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.update)
      .setTitle("✏️ Role Updated")
      .addFields(
        { name: "Role", value: `${newRole}` },
        { name: "Changes", value: changes.join("\n") },
        { name: "Updated by", value: actorField(actor) },
      )
      .setTimestamp();
    sendLog(client, "roles", embed);
  });

  // ================= CHANNELS =================
  client.on("channelCreate", async (channel) => {
    if (!channel.guild) return;
    const actor = await getAuditActor(
      channel.guild,
      AuditLogEvent.ChannelCreate,
      channel.id,
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.create)
      .setTitle("➕ Channel Created")
      .addFields(
        {
          name: "Channel",
          value: `${channel} (\`${ChannelType[channel.type]}\`)`,
        },
        { name: "Created by", value: actorField(actor) },
      )
      .setTimestamp();
    sendLog(client, "channels", embed);
  });

  client.on("channelDelete", async (channel) => {
    if (!channel.guild) return;
    const actor = await getAuditActor(
      channel.guild,
      AuditLogEvent.ChannelDelete,
      channel.id,
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.delete)
      .setTitle("➖ Channel Deleted")
      .addFields(
        {
          name: "Channel",
          value: `\`#${channel.name}\` (\`${ChannelType[channel.type]}\`)`,
        },
        { name: "Deleted by", value: actorField(actor) },
      )
      .setTimestamp();
    sendLog(client, "channels", embed);
  });

  client.on("channelUpdate", async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;
    const changes = [];
    if (oldChannel.name !== newChannel.name)
      changes.push(`Name: \`${oldChannel.name}\` → \`${newChannel.name}\``);
    if (oldChannel.topic !== newChannel.topic) changes.push(`Topic changed`);
    if (oldChannel.nsfw !== newChannel.nsfw)
      changes.push(`NSFW: ${oldChannel.nsfw} → ${newChannel.nsfw}`);
    if (oldChannel.parentId !== newChannel.parentId)
      changes.push(`Category changed`);
    if (changes.length === 0) return;

    const actor = await getAuditActor(
      newChannel.guild,
      AuditLogEvent.ChannelUpdate,
      newChannel.id,
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.update)
      .setTitle("✏️ Channel Updated")
      .addFields(
        { name: "Channel", value: `${newChannel}` },
        { name: "Changes", value: changes.join("\n") },
        { name: "Updated by", value: actorField(actor) },
      )
      .setTimestamp();
    sendLog(client, "channels", embed);
  });

  // ================= MEMBERS (server join/leave) =================
  client.on("guildMemberAdd", (member) => {
    const embed = new EmbedBuilder()
      .setColor(COLORS.join)
      .setTitle("📥 Member Joined")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${member} (${member.user.tag})` },
        {
          name: "Account created",
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
        },
      )
      .setTimestamp();
    sendLog(client, "members", embed);
  });

  client.on("guildMemberRemove", async (member) => {
    const actor = await getAuditActor(
      member.guild,
      AuditLogEvent.MemberKick,
      member.id,
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.leave)
      .setTitle(actor ? "📤 Member Kicked" : "📤 Member Left")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields({ name: "User", value: `${member.user.tag} (${member.id})` });
    if (actor) embed.addFields({ name: "Kicked by", value: actorField(actor) });
    embed.setTimestamp();
    sendLog(client, "members", embed);
  });

  // ================= BANS =================
  client.on("guildBanAdd", async (ban) => {
    const actor = await getAuditActor(
      ban.guild,
      AuditLogEvent.MemberBanAdd,
      ban.user.id,
    );
    const reason = ban.reason || "No reason provided";
    const embed = new EmbedBuilder()
      .setColor(COLORS.ban)
      .setTitle("🔨 Member Banned")
      .addFields(
        { name: "User", value: `${ban.user.tag} (${ban.user.id})` },
        { name: "Banned by", value: actorField(actor) },
        { name: "Reason", value: reason },
      )
      .setTimestamp();
    sendLog(client, "bans", embed);
  });

  client.on("guildBanRemove", async (ban) => {
    const actor = await getAuditActor(
      ban.guild,
      AuditLogEvent.MemberBanRemove,
      ban.user.id,
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.unban)
      .setTitle("🔓 Member Unbanned")
      .addFields(
        { name: "User", value: `${ban.user.tag} (${ban.user.id})` },
        { name: "Unbanned by", value: actorField(actor) },
      )
      .setTimestamp();
    sendLog(client, "bans", embed);
  });

  // ================= VOICE (join/leave/move) =================
  client.on("voiceStateUpdate", (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member) return;

    if (!oldState.channelId && newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.join)
        .setTitle("🔊 Joined Voice Channel")
        .addFields(
          { name: "User", value: `${member}` },
          { name: "Channel", value: `${newState.channel}` },
        )
        .setTimestamp();
      sendLog(client, "voice", embed);
    } else if (oldState.channelId && !newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.leave)
        .setTitle("🔇 Left Voice Channel")
        .addFields(
          { name: "User", value: `${member}` },
          { name: "Channel", value: `${oldState.channel}` },
        )
        .setTimestamp();
      sendLog(client, "voice", embed);
    } else if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.update)
        .setTitle("🔀 Moved Voice Channel")
        .addFields(
          { name: "User", value: `${member}` },
          { name: "From", value: `${oldState.channel}` },
          { name: "To", value: `${newState.channel}` },
        )
        .setTimestamp();
      sendLog(client, "voice", embed);
    }
  });

  // ================= PROFILE (nickname, roles, avatar, username) =================
  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    // --- nickname change ---
    if (oldMember.nickname !== newMember.nickname) {
      const actor = await getAuditActor(
        newMember.guild,
        AuditLogEvent.MemberUpdate,
        newMember.id,
      );
      const embed = new EmbedBuilder()
        .setColor(COLORS.update)
        .setTitle("📝 Nickname Changed")
        .addFields(
          { name: "User", value: `${newMember}` },
          {
            name: "Before",
            value: oldMember.nickname || "*(none)*",
            inline: true,
          },
          {
            name: "After",
            value: newMember.nickname || "*(none)*",
            inline: true,
          },
          { name: "Changed by", value: actorField(actor) },
        )
        .setTimestamp();
      sendLog(client, "profile", embed);
    }

    // --- roles added/removed on a member ---
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    const added = newRoles.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newRoles.has(r.id));

    if (added.size > 0 || removed.size > 0) {
      const actor = await getAuditActor(
        newMember.guild,
        AuditLogEvent.MemberRoleUpdate,
        newMember.id,
      );
      const embed = new EmbedBuilder()
        .setColor(COLORS.update)
        .setTitle("🎭 Member Roles Changed")
        .addFields({ name: "User", value: `${newMember}` });
      if (added.size > 0)
        embed.addFields({
          name: "Added",
          value: added.map((r) => `${r}`).join(", "),
        });
      if (removed.size > 0)
        embed.addFields({
          name: "Removed",
          value: removed.map((r) => `${r}`).join(", "),
        });
      embed
        .addFields({ name: "Changed by", value: actorField(actor) })
        .setTimestamp();
      sendLog(client, "profile", embed);
    }
  });

  // --- avatar / username change (global event, so filter to shared guilds) ---
  client.on("userUpdate", (oldUser, newUser) => {
    const avatarChanged = oldUser.avatar !== newUser.avatar;
    const usernameChanged = oldUser.username !== newUser.username;
    if (!avatarChanged && !usernameChanged) return;

    for (const guild of client.guilds.cache.values()) {
      if (!guild.members.cache.has(newUser.id)) continue;

      const embed = new EmbedBuilder()
        .setColor(COLORS.update)
        .setTitle(avatarChanged ? "🖼️ Avatar Changed" : "🏷️ Username Changed")
        .setThumbnail(newUser.displayAvatarURL())
        .addFields({ name: "User", value: `<@${newUser.id}> (${newUser.id})` });

      if (usernameChanged) {
        embed.addFields(
          { name: "Before", value: oldUser.username, inline: true },
          { name: "After", value: newUser.username, inline: true },
        );
      }
      embed.setTimestamp();
      sendLog(client, "profile", embed);
    }
  });

  // ================= INVITES (created / deleted) =================
  client.on("inviteCreate", (invite) => {
    const embed = new EmbedBuilder()
      .setColor(COLORS.create)
      .setTitle("🔗 Invite Created")
      .addFields(
        { name: "Code", value: `\`${invite.code}\`` },
        { name: "Channel", value: `${invite.channel}` },
        {
          name: "Created by",
          value: invite.inviter
            ? `${invite.inviter} (${invite.inviter.tag})`
            : "Unknown",
        },
        {
          name: "Max uses",
          value: invite.maxUses ? `${invite.maxUses}` : "Unlimited",
          inline: true,
        },
        {
          name: "Expires",
          value: invite.expiresTimestamp
            ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>`
            : "Never",
          inline: true,
        },
      )
      .setTimestamp();
    sendLog(client, "invites", embed);
  });

  client.on("inviteDelete", (invite) => {
    const embed = new EmbedBuilder()
      .setColor(COLORS.delete)
      .setTitle("🗑️ Invite Deleted")
      .addFields({ name: "Code", value: `\`${invite.code}\`` })
      .setTimestamp();
    sendLog(client, "invites", embed);
  });

  console.log(
    "[server-logs] Registered. Active categories:",
    Object.entries(CHANNELS)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "none configured",
  );
}

module.exports = { registerServerLogs };

/**
 * ---- Add to your .env ----
 * LOG_CHANNEL_ROLES=your_channel_id
 * LOG_CHANNEL_CHANNELS=your_channel_id
 * LOG_CHANNEL_MEMBERS=your_channel_id
 * LOG_CHANNEL_VOICE=your_channel_id
 * LOG_CHANNEL_PROFILE=your_channel_id
 * LOG_CHANNEL_BANS=your_channel_id
 * LOG_CHANNEL_INVITES=your_channel_id
 *
 * You can point several of these at the SAME channel ID if you'd rather
 * have fewer, combined logs — just reuse an ID across the vars you want
 * merged. Any var left blank is simply skipped (no error).
 */
