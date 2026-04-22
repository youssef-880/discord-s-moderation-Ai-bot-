const db = require('../database'); // Ensure this points to your database file
const { Events } = require('discord.js');

module.exports = (client) => {
    // ─── 1. HANDLE SLASH COMMANDS (InteractionCreate) ──────────
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const { commandName, guildId, channelId } = interaction;

        if (commandName === 'removedescription') {
            try {
                // The key must match exactly what sticky.js looks for: desc_[CHANNEL_ID]
                const featureKey = `desc_${channelId}`;

                const result = await db.query(
                    'DELETE FROM config WHERE guild_id = $1 AND feature = $2',
                    [guildId, featureKey]
                );

                if (result.rowCount > 0) {
                    return interaction.reply({ 
                        content: '✅ **THE VOID HAS CONSUMED THE DESCRIPTION.** Sticky messages are now disabled for this channel.', 
                        ephemeral: true 
                    });
                } else {
                    return interaction.reply({ 
                        content: '❌ **NO DESCRIPTION FOUND.** There was nothing to remove in this channel.', 
                        ephemeral: true 
                    });
                }
            } catch (err) {
                console.error('Error in removedescription:', err);
                return interaction.reply({ content: '🌑 The Abyss encountered an error while deleting.', ephemeral: true });
            }
        }
    });

    // ─── 2. HANDLE PREFIX COMMANDS (MessageCreate) ─────────────
    client.on(Events.MessageCreate, message => {
        if (message.author.bot || !message.guild) return;

        if (message.content === '!ping') {
            message.reply('pong 🏓');
        }
    });
};