const { EmbedBuilder, PermissionFlagsBits, Events, MessageFlags } = require('discord.js');
const db = require('../database');
const aiHandler = require('./ai'); 

const helpers = {
    getChannel: async (guildId, feature) => {
        const { data } = await db.client
            .from('config')
            .select('channel_id')
            .match({ guild_id: guildId, feature: feature })
            .single();
        return data ? data.channel_id : null;
    },
    setChannel: async (guildId, feature, channelId) => {
        await db.client
            .from('config')
            .upsert({ 
                guild_id: guildId, 
                feature: feature, 
                channel_id: channelId 
            }, { onConflict: 'guild_id,feature' });
    },
    removeChannel: async (guildId, feature) => {
        await db.client
            .from('config')
            .delete()
            .match({ guild_id: guildId, feature: feature });
    }
};

module.exports = (client) => {
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'config') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            
            const feature = interaction.options.getString('feature');
            const channel = interaction.options.getChannel('channel');
            
            await helpers.setChannel(interaction.guild.id, feature, channel.id);
            await interaction.editReply({ content: `✅ Set **${feature}** to ${channel}.` });
        }

        // --- UPDATED: SET DAILY TIME FEATURE WITH MINUTE ---
        if (interaction.commandName === 'setdailytime') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            
            const feature = interaction.options.getString('feature');
            let hour = interaction.options.getInteger('hour');
            const minute = interaction.options.getInteger('minute'); // New Minute logic
            const period = interaction.options.getString('period');
            const tz = interaction.options.getString('timezone');

            // Convert 12h to 24h format
            if (period === 'PM' && hour !== 12) hour += 12;
            if (period === 'AM' && hour === 12) hour = 0;
            
            // Format to HH:mm
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

            try {
                // Save Time and Timezone using existing helpers
                await helpers.setChannel(interaction.guild.id, `time-${feature}`, timeString);
                await helpers.setChannel(interaction.guild.id, `tz-${feature}`, tz);

                // Pretty format for the response (e.g., 4:05 PM)
                const displayMinute = minute.toString().padStart(2, '0');
                await interaction.reply({ 
                    content: `✅ **${feature}** is now scheduled for **${interaction.options.getInteger('hour')}:${displayMinute} ${period}** (${tz} time).`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Failed to save the schedule.', flags: [MessageFlags.Ephemeral] });
            }
        }
        // -------------------------------------

        if (interaction.commandName === 'setstarboardemoji') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            const emoji = interaction.options.getString('emoji');
            
            await helpers.setChannel(interaction.guild.id, 'starboard_emoji', emoji);
            await interaction.reply({ content: `✅ Starboard emoji set to: ${emoji}`, flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.commandName === 'setpersonality') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const newPrompt = interaction.options.getString('prompt');
            
            try {
                await helpers.setChannel(interaction.guild.id, 'ai_personality', newPrompt);
                if (aiHandler.personalityCache) {
                    aiHandler.personalityCache.delete(interaction.guild.id);
                }
                await interaction.editReply({ content: '✅ **Personality Shifted.** The Abyss has a new mind for this server.' });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Failed to alter the personality.' });
            }
        }

        if (interaction.commandName === 'setdescription') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const text = interaction.options.getString('text');
            const channelId = interaction.channel.id;

            try {
                const embed = new EmbedBuilder()
                    .setColor('#0a0a0a')
                    .setDescription(`***${text.toUpperCase()}***`)
                    .setFooter({ text: '— THE ABYSS' });

                const msg = await interaction.channel.send({ embeds: [embed] });
                await helpers.setChannel(interaction.guild.id, `desc_${channelId}`, msg.id);
                await interaction.editReply({ content: '✅ The Abyss has been branded.' });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Failed to bind description.' });
            }
        }

        if (interaction.commandName === 'resetpersonality') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            try {
                await helpers.removeChannel(interaction.guild.id, 'ai_personality');
                if (aiHandler.personalityCache) {
                    aiHandler.personalityCache.delete(interaction.guild.id);
                }
                await interaction.editReply({ content: '✅ **Personality Reset.** The Abyss has returned to its original state.' });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Failed to reset the personality.' });
            }
        }

        if (interaction.commandName === 'removedescription') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const channelId = interaction.channel.id;
            const featureKey = `desc_${channelId}`;

            try {
                const oldMsgId = await helpers.getChannel(interaction.guild.id, featureKey);
                if (!oldMsgId) {
                    return interaction.editReply({ content: '❌ No active description found in this channel.' });
                }
                try {
                    const oldMsg = await interaction.channel.messages.fetch(oldMsgId);
                    if (oldMsg) await oldMsg.delete().catch(() => {});
                } catch (e) {}

                await helpers.removeChannel(interaction.guild.id, featureKey);
                await interaction.editReply({ content: '🗑️ The description has been purged.' });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Error during purging.' });
            }
        }

        if (interaction.commandName === 'toggleailimit') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            const status = interaction.options.getBoolean('enabled');
            await helpers.setChannel(interaction.guild.id, 'ai_limit_enabled', status.toString());
            await interaction.reply({ content: `✅ AI Limits are now **${status ? 'ENABLED' : 'DISABLED'}**.`, flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.commandName === 'setailimit') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            const count = interaction.options.getInteger('count');
            await helpers.setChannel(interaction.guild.id, 'ai_limit_count', count.toString());
            await interaction.reply({ content: `✅ AI message limit set to **${count}** per day.`, flags: [MessageFlags.Ephemeral] });
        }
    });
};

module.exports.getConfigChannel = helpers.getChannel;