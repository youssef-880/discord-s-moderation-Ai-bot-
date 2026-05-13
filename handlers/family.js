const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database');
const { getConfigChannel } = require('./config');
const axios = require('axios');

// ─── GIPHY ENGINE ───
// Maps your command names to specific search terms for better GIFs
async function getRandomGif(action) {
    const tagMap = {
        marry: 'anime marriage proposal', divorce: 'anime heartbreak cry',
        adopt: 'anime adoption hug', runaway: 'anime running away',
        disown: 'anime angry sad', hug: 'anime snuggle hug',
        kiss: 'anime romantic kiss', slap: 'anime angry slap',
        pat: 'anime head pat', protect: 'anime shield protect',
        fight: 'anime sword fight battle', forgive: 'anime smile comfort'
    };
    try {
        const response = await axios.get(`https://api.giphy.com/v1/gifs/random`, {
            params: { 
                api_key: process.env.GIPHY_API_KEY, 
                tag: tagMap[action] || 'anime aesthetic', 
                rating: 'pg-13' 
            }
        });
        return response.data.data.images.original.url;
    } catch { return null; }
}

// ─── RELATIONSHIP LOGGING ───
// Sends an announcement to the "relationships" channel if configured in /config
async function announceToRelationships(guild, embed) {
    const channelId = await getConfigChannel(guild.id, 'relationships');
    if (!channelId) return;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel) await channel.send({ embeds: [embed] });
}

// ─── DATABASE HELPERS ───

// Updates the secret "Bond" level between two users
async function updateBond(guildId, u1, u2, bondChange, tensionChange) {
    const ids = [u1, u2].sort(); // Ensure consistent order in DB (User1 is always smaller ID)
    
    const { data: bond } = await db.client
        .from('bonds')
        .select('bond_level, tension')
        .match({ guild_id: guildId, user1_id: ids[0], user2_id: ids[1] })
        .single();

    // Calculate new values (capped between 0 and 100)
    const newBond = Math.min(Math.max((bond?.bond_level || 50) + bondChange, 0), 100);
    const newTension = Math.min(Math.max((bond?.tension || 0) + tensionChange, 0), 100);

    await db.client
        .from('bonds')
        .upsert({
            guild_id: guildId,
            user1_id: ids[0],
            user2_id: ids[1],
            bond_level: newBond,
            tension: newTension
        }, { onConflict: 'guild_id,user1_id,user2_id' });
}

// Ensures a user has a row in the families table before trying to link them
async function ensureUserExists(userId, guildId) {
    await db.client
        .from('families')
        .upsert({ user_id: userId, guild_id: guildId }, { onConflict: 'user_id,guild_id' });
}

module.exports = (client) => {
    client.on(Events.InteractionCreate, async interaction => {
        
        // ─── 1. BUTTON HANDLING (Marriage Acceptance) ───
        if (interaction.isButton()) {
            const [action, status, userId, targetId] = interaction.customId.split('_');
            if (action !== 'marry') return;

            // Only the person being proposed to can click the buttons
            if (interaction.user.id !== targetId) {
                return interaction.reply({ content: "This is not your soul to offer.", flags: [MessageFlags.Ephemeral] });
            }

            if (status === 'accept') {
                await ensureUserExists(userId, interaction.guild.id);
                await ensureUserExists(targetId, interaction.guild.id);

                // Update both users to be partners
                await db.client.from('families').update({ partner_id: targetId }).match({ user_id: userId, guild_id: interaction.guild.id });
                await db.client.from('families').update({ partner_id: userId }).match({ user_id: targetId, guild_id: interaction.guild.id });

                const gif = await getRandomGif('marry');
                const embed = new EmbedBuilder()
                    .setColor('#ff69b4')
                    .setDescription(`***THE VOW IS SEALED.***\n<@${userId}> and <@${targetId}> are now bound in the Abyss.`)
                    .setImage(gif);

                await interaction.update({ content: null, embeds: [embed], components: [] });
                await announceToRelationships(interaction.guild, embed);
            } else {
                await interaction.update({ content: '❌ The offer was rejected. The void remains empty.', components: [] });
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;
        const { commandName, options, user, guild } = interaction;

        // ─── MARRIAGE COMMAND ───
        if (commandName === 'marry') {
            const target = options.getUser('user');
            if (target.id === user.id || target.bot) return interaction.reply({ content: '❌ You cannot marry yourself or a machine.', flags: [MessageFlags.Ephemeral] });

            // Check if either user is already married
            const { data: existing } = await db.client
                .from('families')
                .select('user_id, partner_id')
                .eq('guild_id', guild.id)
                .or(`user_id.eq.${user.id},user_id.eq.${target.id}`);

            if (existing?.some(r => r.partner_id)) {
                return interaction.reply({ content: '❌ One of you is already bound to another soul.', flags: [MessageFlags.Ephemeral] });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`marry_accept_${user.id}_${target.id}`).setLabel('Accept Vow').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`marry_decline_${user.id}_${target.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
            );
            await interaction.reply({ content: `<@${target.id}>, <@${user.id}> offers their soul. Accept?`, components: [row] });
        }

        // ─── DIVORCE COMMAND ───
        if (commandName === 'divorce') {
            const { data } = await db.client
                .from('families')
                .select('partner_id')
                .match({ user_id: user.id, guild_id: guild.id })
                .single();

            if (!data?.partner_id) return interaction.reply({ content: '❌ You have no bond to sever.', flags: [MessageFlags.Ephemeral] });

            const partnerId = data.partner_id;
            // Set partner_id to null for both people
            await db.client.from('families').update({ partner_id: null }).eq('guild_id', guild.id).in('user_id', [user.id, partnerId]);
            
            const gif = await getRandomGif('divorce');
            const embed = new EmbedBuilder().setColor('#000000').setDescription(`***THE BOND IS SEVERED.***\n<@${user.id}> and <@${partnerId}> have returned to the void alone.`).setImage(gif);
            await interaction.reply({ embeds: [embed] });
            await announceToRelationships(guild, embed);
        }

        // ─── SOCIAL COMMANDS (Slap, Hug, Kiss, etc.) ───
        const socialActions = ['slap', 'hug', 'kiss', 'pat', 'protect', 'fight', 'forgive'];
        if (socialActions.includes(commandName)) {
            const target = options.getUser('user');
            if (target.id === user.id) return interaction.reply({ content: '❌ You cannot interact with your own shadow this way.', flags: [MessageFlags.Ephemeral] });

            // Impact logic: Positive actions increase bond, negative ones increase tension
            let bondMod = 2, tensionMod = -1;
            if (commandName === 'slap' || commandName === 'fight') {
                bondMod = -5; tensionMod = 10;
            }

            await updateBond(guild.id, user.id, target.id, bondMod, tensionMod);
            const gif = await getRandomGif(commandName);
            
            const actionText = {
                slap: `delivered a sharp slap to`, hug: `wrapped their arms around`,
                kiss: `shared a deep kiss with`, pat: `gently patted the head of`,
                protect: `stood in front of and protected`, fight: `engaged in a fierce battle with`,
                forgive: `offered a warm hand of forgiveness to`
            };

            const embed = new EmbedBuilder()
                .setColor(bondMod < 0 ? '#ff0000' : '#ffffff')
                .setDescription(`<@${user.id}> ${actionText[commandName]} <@${target.id}>.`)
                .setImage(gif);

            await interaction.reply({ embeds: [embed] });
        }

        // ─── CHECK BOND COMMAND ───
        if (commandName === 'checkbond') {
            const target = options.getUser('user');
            const ids = [user.id, target.id].sort();
            const { data: bondData } = await db.client
                .from('bonds')
                .select('*')
                .match({ guild_id: guild.id, user1_id: ids[0], user2_id: ids[1] })
                .single();
            
            const bond = bondData?.bond_level || 50;
            const tension = bondData?.tension || 0;
            const embed = new EmbedBuilder()
                .setTitle('⚖️ Connection Analysis')
                .setColor(tension > 50 ? '#ff0000' : '#1a1a2e')
                .addFields(
                    { name: 'Loyalty/Bond', value: `> ${bond}%`, inline: true },
                    { name: 'Tension', value: `> ${tension}%`, inline: true }
                )
                .setFooter({ text: 'The Abyss monitors all connections.' });
            await interaction.reply({ embeds: [embed] });
        }
    });
};