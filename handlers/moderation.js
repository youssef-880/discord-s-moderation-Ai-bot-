const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfigChannel } = require('./config');
const db = require('../database');

const warnings = {};

async function getModLogsChannel(guild) {
    const logChannelId = await getConfigChannel(guild.id, 'mod-logs');
    return guild.channels.cache.get(logChannelId);
}

async function sendModLog(guild, embed) {
    const channel = await getModLogsChannel(guild);
    if (channel) channel.send({ embeds: [embed] }).catch(() => null);
}

module.exports = (client) => {
    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        const { commandName, guild, member, options } = interaction;

        // ─── ANNOUNCE ──────────────────────────────────
        if (commandName === 'announce') {
            if (!member.permissions.has(PermissionFlagsBits.ManageMessages))
                return interaction.reply({ content: '❌ The Abyss only obeys its masters.', ephemeral: true });

            const title = options.getString('title');
            const message = options.getString('message');
            const imageUrl = options.getString('image');

            const announceChannelId = await getConfigChannel(guild.id, 'announcements');
            if (!announceChannelId) {
                return interaction.reply({
                    content: '❌ Announcement channel not set. Use `/config feature:announcements` first.',
                    ephemeral: true
                });
            }

            const announceChannel = guild.channels.cache.get(announceChannelId);
            if (!announceChannel) return interaction.reply({ content: '❌ Configured channel not found.', ephemeral: true });

            const announceEmbed = new EmbedBuilder()
                .setColor('#1a1a2e')
                .setTitle(`📢 ${title}`)
                .setDescription(message)
                .setTimestamp()
                .setFooter({ text: `Oracle: ${member.user.tag}` });

            if (imageUrl) announceEmbed.setImage(imageUrl);

            try {
                await announceChannel.send({ embeds: [announceEmbed] });
                await interaction.reply({ content: `✅ Prophecy delivered to ${announceChannel}!`, ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: '❌ Permission error in that channel.', ephemeral: true });
            }
        }

        // ─── SET STREAK ────────────────────
        if (commandName === 'setstreak') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator))
                return interaction.reply({ content: '❌ Only Administrators can alter the threads of time.', ephemeral: true });

            const target = options.getUser('user');
            const amount = options.getInteger('amount');

            try {
                const res = await db.query('SELECT * FROM streaks WHERE user_id = $1 AND guild_id = $2', [target.id, guild.id]);

                if (res.rows.length > 0) {
                    await db.query('UPDATE streaks SET current_streak = $1 WHERE user_id = $2 AND guild_id = $3', [amount, target.id, guild.id]);
                } else {
                    await db.query(
                        'INSERT INTO streaks (user_id, guild_id, current_streak, longest_streak, last_active_date) VALUES ($1, $2, $3, $3, NULL)',
                        [target.id, guild.id, amount]
                    );
                }

                await interaction.reply({
                    content: `🔥 Updated **${target.tag}**'s streak to **${amount}**.`,
                    ephemeral: true
                });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Failed to update database.', ephemeral: true });
            }
        }

        // ─── SET DESCRIPTION ─────────────────────
        if (commandName === 'setdescription') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels))
                return interaction.reply({ content: '❌ You cannot define the nature of this void.', ephemeral: true });

            const description = options.getString('text');
            const channel = interaction.channel;

            const descEmbed = new EmbedBuilder()
                .setColor('#0a0a0a')
                .setDescription(`***${description.toUpperCase()}***`)
                .setFooter({ text: '— THE ABYSS' });

            try {
                const msg = await channel.send({ embeds: [descEmbed] });

                await db.query(
                    `INSERT INTO config (guild_id, feature, channel_id) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (guild_id, feature) 
           DO UPDATE SET channel_id = EXCLUDED.channel_id`,
                    [guild.id, `desc_${channel.id}`, msg.id]
                );

                await interaction.reply({ content: '✅ Description anchored to this channel.', ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: '❌ Failed to post description.', ephemeral: true });
            }
        }

        // ─── SAY COMMAND ───────────────────────────────────────
        if (commandName === 'say') {
            if (!member.permissions.has(PermissionFlagsBits.ManageMessages))
                return interaction.reply({ content: '❌ Permissions denied.', ephemeral: true });

            const targetChannel = options.getChannel('channel');
            const messageText = options.getString('message');

            try {
                await targetChannel.send(messageText);
                await interaction.reply({ content: `✅ Message sent to ${targetChannel}`, ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: '❌ I cannot send messages there.', ephemeral: true });
            }
        }

        // ─── MODERATION BASICS ──
        if (commandName === 'ban') {
            if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ You do not have permission.', ephemeral: true });
            const target = options.getMember('user');
            const reason = options.getString('reason') ?? 'No reason provided';
            if (!target || !target.bannable) return interaction.reply({ content: '❌ Cannot ban this user.', ephemeral: true });
            await target.ban({ reason });
            const embed = new EmbedBuilder().setColor('Red').setTitle('🔨 User Banned').addFields({ name: 'User', value: `${target.user.tag}`, inline: true }, { name: 'Reason', value: reason }).setTimestamp();
            await interaction.reply({ embeds: [embed] });
            await sendModLog(guild, embed);
        }

        if (commandName === 'unban') {
            if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ You do not have permission.', ephemeral: true });
            const userId = options.getString('userid');
            try {
                await guild.members.unban(userId);
                const embed = new EmbedBuilder().setColor('Green').setTitle('✅ User Unbanned').setTimestamp();
                await interaction.reply({ embeds: [embed] });
                await sendModLog(guild, embed);
            } catch {
                interaction.reply({ content: '❌ Invalid User ID.', ephemeral: true });
            }
        }

        if (commandName === 'kick') {
            if (!member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: '❌ No permission.', ephemeral: true });
            const target = options.getMember('user');
            if (!target || !target.kickable) return interaction.reply({ content: '❌ Cannot kick.', ephemeral: true });
            await target.kick();
            const embed = new EmbedBuilder().setColor('Orange').setTitle('👢 User Kicked').setTimestamp();
            await interaction.reply({ embeds: [embed] });
            await sendModLog(guild, embed);
        }

        if (commandName === 'mute') {
            if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ No permission.', ephemeral: true });
            const target = options.getMember('user');
            const duration = options.getInteger('duration');
            if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
            await target.timeout(duration * 60 * 1000);
            const embed = new EmbedBuilder().setColor('Yellow').setTitle('🔇 User Muted').setTimestamp();
            await interaction.reply({ embeds: [embed] });
            await sendModLog(guild, embed);
        }

        if (commandName === 'unmute') {
            if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ No permission.', ephemeral: true });
            const target = options.getMember('user');
            if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
            await target.timeout(null);
            const embed = new EmbedBuilder().setColor('Green').setTitle('🔊 User Unmuted').setTimestamp();
            await interaction.reply({ embeds: [embed] });
            await sendModLog(guild, embed);
        }

        if (commandName === 'warn') {
            if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ No permission.', ephemeral: true });
            const target = options.getMember('user');
            const reason = options.getString('reason');
            if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
            const userId = target.user.id;
            if (!warnings[userId]) warnings[userId] = [];
            warnings[userId].push({ reason, moderator: member.user.tag, date: new Date().toISOString() });
            const embed = new EmbedBuilder().setColor('Yellow').setTitle('⚠️ User Warned').setTimestamp();
            await interaction.reply({ embeds: [embed] });
            await sendModLog(guild, embed);
        }

        if (commandName === 'warnings') {
            const target = options.getMember('user');
            const userId = target.user.id;
            const userWarnings = warnings[userId];
            if (!userWarnings || userWarnings.length === 0) return interaction.reply({ content: '✅ No warnings.' });
            const list = userWarnings.map((w, i) => `**${i + 1}.** ${w.reason}`).join('\n');
            const embed = new EmbedBuilder().setTitle(`Warnings for ${target.user.tag}`).setDescription(list);
            await interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'lockdown') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ No permission.', ephemeral: true });
            const everyoneRole = guild.roles.everyone;
            await everyoneRole.setPermissions(everyoneRole.permissions.remove(PermissionFlagsBits.SendMessages));
            await interaction.reply({ content: '🔒 Server Locked.' });
        }

        if (commandName === 'unlockdown') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ No permission.', ephemeral: true });
            const everyoneRole = guild.roles.everyone;
            await everyoneRole.setPermissions(everyoneRole.permissions.add(PermissionFlagsBits.SendMessages));
            await interaction.reply({ content: '🔓 Server Unlocked.' });
        }

        // ─── AI LIMIT COMMANDS ──────────────────────────────────
        if (commandName === 'toggleailimit') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator))
                return interaction.reply({ content: '❌ Only masters of the void can toggle limits.', ephemeral: true });

            const enabled = options.getBoolean('enabled');
            await db.query(
                'INSERT INTO config (guild_id, feature, channel_id) VALUES ($1, $2, $3) ON CONFLICT (guild_id, feature) DO UPDATE SET channel_id = EXCLUDED.channel_id',
                [guild.id, 'ai_limit_enabled', enabled ? 'true' : 'false']
            );

            return interaction.reply({ content: `🤖 AI Message limits have been **${enabled ? 'ENABLED' : 'DISABLED'}**.` });
        }

        if (commandName === 'setailimit') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator))
                return interaction.reply({ content: '❌ Only masters of the void can set limits.', ephemeral: true });

            const count = options.getInteger('count');
            await db.query(
                'INSERT INTO config (guild_id, feature, channel_id) VALUES ($1, $2, $3) ON CONFLICT (guild_id, feature) DO UPDATE SET channel_id = EXCLUDED.channel_id',
                [guild.id, 'ai_limit_count', count.toString()]
            );

            return interaction.reply({ content: `🤖 AI Message limit set to **${count}** per user per day.` });
        }

        // ─── RESET STRIKES (GUARDIAN PARDON) ─────────────────────
        if (commandName === 'resetstrikes') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator))
                return interaction.reply({ content: '❌ Only Administrators can pardon a soul.', ephemeral: true });

            const target = options.getUser('user');

            // Defer the reply to give the database time to process
            await interaction.deferReply({ ephemeral: true });

            try {
                const res = await db.query(
                    'DELETE FROM guardian_strikes WHERE user_id = $1 AND guild_id = $2',
                    [target.id, guild.id]
                );

                if (res.rowCount === 0) {
                    return interaction.editReply({
                        content: `⚠️ No active strikes found for **${target.tag}** in this specific server.`
                    });
                }

                const pardonEmbed = new EmbedBuilder()
                    .setColor('#00ffcc')
                    .setTitle('🛡️ GUARDIAN PARDON')
                    .setDescription(`The Guardian has cleared **${res.rowCount}** record(s) for **${target.tag}**. Their soul is once again pure.`)
                    .setTimestamp()
                    .setFooter({ text: 'The Abyss - Redemption' });

                await interaction.editReply({ embeds: [pardonEmbed] });
                await sendModLog(guild, pardonEmbed);
            } catch (err) {
                console.error('DATABASE ERROR:', err);
                await interaction.editReply({ content: '❌ Failed to clear strikes from the database.' });
            }
        }
    });
};