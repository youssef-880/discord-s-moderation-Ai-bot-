const { EmbedBuilder, Events, AuditLogEvent } = require('discord.js');
const { getConfigChannel } = require('./config');

module.exports = (client) => {

    // ─── MESSAGE DELETE LOGGER ──────────────────────────────
    client.on(Events.MessageDelete, async (message) => {
        if (message.partial || message.author?.bot || !message.guild) return;

        const logChannelId = await getConfigChannel(message.guild.id, 'message-logs');
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#ff4500')
            .setTitle('🗑️ Message Deleted')
            .addFields(
                { name: 'Author', value: `${message.author.tag} (${message.author.id})`, inline: false },
                { name: 'Channel', value: `${message.channel}`, inline: true },
                { name: 'Content', value: message.content || '*[No text content]*', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'The Abyss Monitoring' });

        await logChannel.send({ embeds: [embed] }).catch(() => null);
    });

    // ─── MESSAGE EDIT LOGGER ────────────────────────────────
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        if (oldMessage.partial || oldMessage.author?.bot || !oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return;

        const logChannelId = await getConfigChannel(oldMessage.guild.id, 'message-logs');
        const logChannel = oldMessage.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#1e90ff')
            .setTitle('📝 Message Edited')
            .addFields(
                { name: 'Author', value: `${oldMessage.author.tag}`, inline: false },
                { name: 'Channel', value: `${oldMessage.channel}`, inline: true },
                { name: 'Before', value: oldMessage.content || '*[No content]*', inline: false },
                { name: 'After', value: newMessage.content || '*[No content]*', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'The Abyss Monitoring' });

        await logChannel.send({ embeds: [embed] }).catch(() => null);
    });

    // ─── VOICE LOGS (Join/Leave/Move) ───────────────────────
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const logChannelId = await getConfigChannel(newState.guild.id, 'join-logs');
        const logChannel = newState.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder().setColor('#2f3136').setTimestamp();
        const user = newState.member.user;

        if (!oldState.channelId && newState.channelId) {
            embed.setDescription(`🎙️ **${user.tag}** joined voice channel **${newState.channel.name}**`);
        } else if (oldState.channelId && !newState.channelId) {
            embed.setDescription(`🔇 **${user.tag}** left voice channel **${oldState.channel.name}**`);
        } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            embed.setDescription(`🔄 **${user.tag}** moved from **${oldState.channel.name}** to **${newState.channel.name}**`);
        } else return;

        await logChannel.send({ embeds: [embed] }).catch(() => null);
    });

    // ─── MEMBER UPDATES (Nicknames/Roles) ───────────────────
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const logChannelId = await getConfigChannel(newMember.guild.id, 'join-logs');
        const logChannel = newMember.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#7289da')
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setTimestamp();

        if (oldMember.nickname !== newMember.nickname) {
            embed.setTitle('📝 Nickname Changed')
                .addFields(
                    { name: 'Before', value: oldMember.nickname || 'None', inline: true },
                    { name: 'After', value: newMember.nickname || 'None', inline: true }
                );
            return logChannel.send({ embeds: [embed] });
        }

        if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
            const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
            const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
            if (added.size > 0) embed.setDescription(`✅ **Role Added:** ${added.map(r => r.name).join(', ')}`);
            if (removed.size > 0) embed.setDescription(`❌ **Role Removed:** ${removed.map(r => r.name).join(', ')}`);
            return logChannel.send({ embeds: [embed] });
        }
    });

    // ─── SERVER CHANGES (Name/Icon) ─────────────────────────
    client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
        const logChannelId = await getConfigChannel(newGuild.id, 'mod-logs');
        const logChannel = newGuild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder().setColor('#f1c40f').setTimestamp().setTitle('🏛️ Server Updated');
        if (oldGuild.name !== newGuild.name) {
            embed.addFields(
                { name: 'Old Name', value: oldGuild.name, inline: true },
                { name: 'New Name', value: newGuild.name, inline: true }
            );
            await logChannel.send({ embeds: [embed] });
        }
    });
};