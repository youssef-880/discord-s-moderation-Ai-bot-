const { Events, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database'); 

module.exports = (client) => {

    // ─── 1. SLASH COMMANDS (/trigger) ───
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== 'trigger') return;

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const { options, guildId, member } = interaction;
        if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.editReply({ content: '❌ Permissions denied.' });
        }

        const word = options.getString('word').toLowerCase();
        const reply = options.getString('reply');

        try {
            // New Supabase Upsert (Insert or Update on conflict)
            const { error } = await db.client
                .from('triggers')
                .upsert({ 
                    guild_id: guildId, 
                    trigger_word: word, 
                    response_text: reply 
                }, { onConflict: 'guild_id,trigger_word' });

            if (error) throw error;

            await interaction.editReply({ content: `✅ The Abyss now responds to **${word}**.` });
        } catch (err) {
            console.error('❌ Supabase Error:', err.message);
            await interaction.editReply({ content: `❌ Database Error: ${err.message}` });
        }
    });

    // ─── 2. MESSAGE LISTENER ───
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot || !message.guild) return;

        try {
            // Fetch triggers for this guild using SDK
            const { data: triggers, error } = await db.client
                .from('triggers')
                .select('trigger_word, response_text')
                .eq('guild_id', message.guild.id);

            if (error) throw error;
            if (!triggers || triggers.length === 0) return;

            const content = message.content.toLowerCase();
            
            // Find a matching trigger word
            const match = triggers.find(t => {
                // Defensive check: ensure trigger_word exists before calling toLowerCase
                if (!t.trigger_word) return false;
                
                const escaped = t.trigger_word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escaped}\\b`, 'i');
                return regex.test(content);
            });

            if (match) {
                await message.channel.send(match.response_text);
            }
        } catch (error) {
            // This stops the "Cannot read properties of undefined" crash
            console.error('❌ Trigger Execution Error:', error.message);
        }
    });
};