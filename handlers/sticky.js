const { Events, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = (client) => {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot || !message.guild) return;

        try {
            // 1. Check if this channel has a description registered using Supabase SDK
            const { data: config, error: fetchError } = await db.client
                .from('config')
                .select('channel_id')
                .match({ 
                    guild_id: message.guild.id, 
                    feature: `desc_${message.channel.id}` 
                })
                .single();

            // If no sticky is set for this channel, just stop
            if (fetchError || !config) return;

            const oldMsgId = config.channel_id;
            let savedDescription = 'THE VOID IS SILENT.'; // Fallback if fetch fails

            // 2. Fetch the old message to "steal" the text back
            try {
                const oldMsg = await message.channel.messages.fetch(oldMsgId);
                if (oldMsg && oldMsg.embeds.length > 0) {
                    savedDescription = oldMsg.embeds[0].description || savedDescription;
                    // Clean out old bold markers
                    savedDescription = savedDescription.replace(/\*\*\*/g, '');
                    
                    await oldMsg.delete().catch(() => {});
                }
            } catch (e) { 
                /* Message probably already deleted, we use the fallback or previous known text */ 
            }

            // 3. Create the NEW Clean Embed
            const descEmbed = new EmbedBuilder()
                .setColor('#0a0a0a')
                .setDescription(`***${savedDescription.toUpperCase()}***`)
                .setFooter({ text: '— THE ABYSS' });

            // 4. Send it
            const newMsg = await message.channel.send({ embeds: [descEmbed] });

            // 5. Update the Message ID in Supabase
            await db.client
                .from('config')
                .update({ channel_id: newMsg.id })
                .match({ 
                    guild_id: message.guild.id, 
                    feature: `desc_${message.channel.id}` 
                });

        } catch (err) {
            console.error('Sticky Error:', err);
        }
    });
};