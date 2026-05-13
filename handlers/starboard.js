const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

module.exports = (client) => {
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        try {
            if (user.bot) return;

            // 1. Handle Partials (Ensures old messages are readable)
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();

            const { message, emoji } = reaction;
            const guildId = message.guild.id;

            // 2. Fetch Config from Supabase
            const { data: configData, error } = await db.client
                .from('config')
                .select('feature, channel_id')
                .in('feature', ['starboard_channel', 'starboard_emoji'])
                .eq('guild_id', guildId);

            if (error || !configData) return;

            let starboardChannelId = null;
            let requiredEmoji = '⭐'; 

            for (const row of configData) {
                if (row.feature === 'starboard_channel') starboardChannelId = row.channel_id;
                if (row.feature === 'starboard_emoji') requiredEmoji = row.channel_id;
            }

            if (!starboardChannelId) return;

            // 3. FUZZY EMOJI CHECK
            const cleanEmoji = (str) => str ? str.replace(/\uFE0F/g, '') : '';
            const currentEmojiClean = cleanEmoji(emoji.toString());
            const targetEmojiClean = cleanEmoji(requiredEmoji);

            const isMatch = (emoji.id === requiredEmoji) || 
                            (emoji.name === requiredEmoji) || 
                            (currentEmojiClean === targetEmojiClean);

            if (!isMatch) return;

            // 4. (REMOVED) Self-Starring check is gone so you can test freely.

            const starChannel = await message.guild.channels.fetch(starboardChannelId).catch(() => null);
            if (!starChannel) return;

            // 5. Check for duplicates
            const fetchedMessages = await starChannel.messages.fetch({ limit: 20 });
            const alreadyStarred = fetchedMessages.find(m => 
                m.embeds.length > 0 && m.embeds[0].footer?.text?.includes(message.id)
            );

            if (alreadyStarred) {
                console.log(`⏭️ Message ${message.id} is already in the archives.`);
                return;
            }

            // 6. Build the Archive Embed
            const embed = new EmbedBuilder()
                .setColor('#ffac33')
                .setAuthor({ 
                    name: message.author.tag, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setDescription(message.content || '*[Attachment Only]*')
                .addFields(
                    { name: 'Source', value: `<#${message.channel.id}>`, inline: true },
                    { name: 'Context', value: `✨ [Jump to Message](${message.url})`, inline: true }
                )
                .setFooter({ text: `ID: ${message.id} • The Abyss Archives` })
                .setTimestamp(message.createdAt);

            const image = message.attachments.first()?.url;
            if (image) embed.setImage(image);

            // 7. Final Send
            console.log(`✨ Attempting to send message ${message.id} to Starboard...`);
            await starChannel.send({ embeds: [embed] });
            console.log(`✅ Success!`);

        } catch (err) {
            console.error("🌑 Starboard Error:", err);
        }
    });
};