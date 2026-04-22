const { EmbedBuilder, PermissionFlagsBits, Events, MessageFlags } = require('discord.js');
const db = require('../database');
const aiHandler = require('./ai'); // 🔥 Added to control the Cache

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

        // ─── GENERAL CONFIG (Channel mapping) ───
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

        // ─── STARBOARD EMOJI CONFIG ───
        if (interaction.commandName === 'setstarboardemoji') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            const emoji = interaction.options.getString('emoji');
            
            await helpers.setChannel(interaction.guild.id, 'starboard_emoji', emoji);
            await interaction.reply({ content: `✅ Starboard emoji set to: ${emoji}`, flags: [MessageFlags.Ephemeral] });
        }

        // ─── AI PERSONALITY CONFIG ───
        if (interaction.commandName === 'setpersonality') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const newPrompt = interaction.options.getString('prompt');
            
            try {
                // Save the long text into the channel_id column
                await helpers.setChannel(interaction.guild.id, 'ai_personality', newPrompt);
                
                // 🔥 INSTANT UPDATE: Clear the cache for this specific server
                if (aiHandler.personalityCache) {
                    aiHandler.personalityCache.delete(interaction.guild.id);
                }
                
                await interaction.editReply({ content: '✅ **Personality Shifted.** The Abyss has a new mind for this server.' });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Failed to alter the personality.' });
            }
        }

        // ─── SET DESCRIPTION ───
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

        // ─── RESET AI PERSONALITY ───
        if (interaction.commandName === 'resetpersonality') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            
            try {
                // Delete the row from Supabase
                await helpers.removeChannel(interaction.guild.id, 'ai_personality');
                
                // Clear the cache so it updates instantly
                if (aiHandler.personalityCache) {
                    aiHandler.personalityCache.delete(interaction.guild.id);
                }
                
                await interaction.editReply({ content: '✅ **Personality Reset.** The Abyss has returned to its original state.' });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Failed to reset the personality.' });
            }
        }

        // ─── REMOVE DESCRIPTION ───
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
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: '❌ Error during purging.' });
                }
            }
        }

        // ─── AI LIMIT TOGGLE ───
        if (interaction.commandName === 'toggleailimit') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: '❌ Forbidden.', flags: [MessageFlags.Ephemeral] });
            }
            const status = interaction.options.getBoolean('enabled');
            await helpers.setChannel(interaction.guild.id, 'ai_limit_enabled', status.toString());
            await interaction.reply({ content: `✅ AI Limits are now **${status ? 'ENABLED' : 'DISABLED'}**.`, flags: [MessageFlags.Ephemeral] });
        }

        // ─── SET AI LIMIT COUNT ───
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

// This allows your logger.js and moderation.js to import the helper correctly
module.exports.getConfigChannel = helpers.getChannel;