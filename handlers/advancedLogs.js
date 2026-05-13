const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = (client) => {
    
    // Helper function to get the log channel from your config
    const getLogChannel = async (guild, type) => {
        // Replace this with your actual database/config fetch logic
        // Example: const channelId = await db.get(guild.id, type);
        // For now, I'll assume you have a way to get 'mod-logs' or 'message-logs'
        return guild.channels.cache.find(c => c.name === 'mod-logs'); 
    };

    // --- MEMBER UPDATES (PFP, Nickname, Roles) ---
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const logChannel = await getLogChannel(newMember.guild, 'mod-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder().setTimestamp().setFooter({ text: `ID: ${newMember.id}` });

        // Nickname Change
        if (oldMember.nickname !== newMember.nickname) {
            embed.setTitle('📝 Nickname Changed')
                .setColor('#3498db')
                .addFields(
                    { name: 'Before', value: oldMember.nickname || 'None', inline: true },
                    { name: 'After', value: newMember.nickname || 'None', inline: true }
                )
                .setAuthor({ name: newMember.user.tag, iconURL: newMember.displayAvatarURL() });
            return logChannel.send({ embeds: [embed] });
        }

        // Role Updates
        if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

            embed.setTitle('🛡️ Roles Updated')
                .setColor('#e67e22')
                .setAuthor({ name: newMember.user.tag, iconURL: newMember.displayAvatarURL() });

            if (addedRoles.size > 0) embed.addFields({ name: 'Added', value: addedRoles.map(r => r.name).join(', ') });
            if (removedRoles.size > 0) embed.addFields({ name: 'Removed', value: removedRoles.map(r => r.name).join(', ') });

            return logChannel.send({ embeds: [embed] });
        }
    });

    // --- USER UPDATES (Avatar, Username) ---
    client.on(Events.UserUpdate, async (oldUser, newUser) => {
        // Note: This is global, so we check mutual guilds
        client.guilds.cache.forEach(async (guild) => {
            const member = await guild.members.fetch(newUser.id).catch(() => null);
            if (!member) return;

            const logChannel = await getLogChannel(guild, 'mod-logs');
            if (!logChannel) return;

            if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
                const embed = new EmbedBuilder()
                    .setTitle('🖼️ Avatar Changed')
                    .setColor('#9b59b6')
                    .setAuthor({ name: newUser.tag, iconURL: newUser.displayAvatarURL() })
                    .setThumbnail(oldUser.displayAvatarURL())
                    .setImage(newUser.displayAvatarURL())
                    .setDescription('Old avatar (left/top) vs New avatar (below)');
                logChannel.send({ embeds: [embed] });
            }
        });
    });

    // --- CHANNEL UPDATES ---
    client.on(Events.ChannelCreate, async (channel) => {
        const logChannel = await getLogChannel(channel.guild, 'mod-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('📁 Channel Created')
            .setColor('#2ecc71')
            .setDescription(`Name: **${channel.name}**\nType: ${channel.type}`)
            .setTimestamp();
        logChannel.send({ embeds: [embed] });
    });

    client.on(Events.ChannelDelete, async (channel) => {
        const logChannel = await getLogChannel(channel.guild, 'mod-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Channel Deleted')
            .setColor('#e74c3c')
            .setDescription(`Name: **${channel.name}**`)
            .setTimestamp();
        logChannel.send({ embeds: [embed] });
    });

    // --- ROLE UPDATES ---
    client.on(Events.RoleCreate, async (role) => {
        const logChannel = await getLogChannel(role.guild, 'mod-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('✨ Role Created')
            .setColor(role.color || '#2ecc71')
            .setDescription(`Name: ${role.name}`)
            .setTimestamp();
        logChannel.send({ embeds: [embed] });
    });

    // --- BAN/UNBAN ---
    client.on(Events.GuildBanAdd, async (ban) => {
        const logChannel = await getLogChannel(ban.guild, 'mod-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🚫 Soul Banned')
            .setColor('#ff0000')
            .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL() })
            .addFields({ name: 'Reason', value: ban.reason || 'No reason provided' })
            .setTimestamp();
        logChannel.send({ embeds: [embed] });
    });

};