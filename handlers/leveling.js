const { EmbedBuilder, AttachmentBuilder, Events, PermissionFlagsBits } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const db = require('../database'); 
const { getConfigChannel } = require('./config');

const cooldowns = new Map();
const getXpForLevel = (level) => level * 100 + level * level * 50;

async function getUserData(userId, guildId) {
    const { data } = await db.client
        .from('user_levels')
        .select('*')
        .match({ user_id: userId, guild_id: guildId })
        .single();
    
    if (data) return data;

    // Initialize if soul is missing
    const { data: newUser } = await db.client
        .from('user_levels')
        .insert([{ user_id: userId, guild_id: guildId, xp: 0, level: 1 }])
        .select()
        .single();
    return newUser;
}

async function generateLevelCard(member, level) {
    const canvas = createCanvas(800, 250);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    try {
        const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'jpg', size: 256 }));
        ctx.save();
        ctx.beginPath();
        ctx.arc(125, 125, 85, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, 40, 40, 170, 170);
        ctx.restore();
    } catch (e) {}

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(member.user.username.toUpperCase(), 240, 90);

    ctx.font = 'bold 60px sans-serif';
    ctx.fillStyle = '#8b0000';
    ctx.fillText(`LEVEL ${level}`, 240, 160);

    return canvas.toBuffer();
}

module.exports = (client) => {
    client.on(Events.MessageCreate, async message => {
        if (message.author.bot || !message.guild || message.content.startsWith('/')) return;

        const cooldownKey = `${message.author.id}-${message.guild.id}`;
        if (cooldowns.has(cooldownKey) && cooldowns.get(cooldownKey) > Date.now()) return;
        cooldowns.set(cooldownKey, Date.now() + 60000);

        const user = await getUserData(message.author.id, message.guild.id);
        const currentXp = Number(user.xp);
        const xpGain = Math.floor(Math.random() * 10) + 15;
        const newXp = currentXp + xpGain;
        const xpNeeded = getXpForLevel(user.level + 1);

        if (newXp >= xpNeeded) {
            const newLevel = user.level + 1;
            await db.client.from('user_levels').update({ 
                xp: newXp - xpNeeded, 
                level: newLevel 
            }).match({ user_id: message.author.id, guild_id: message.guild.id });
            
            const logChannelId = await getConfigChannel(message.guild.id, 'level-up');
            let logChannel = message.channel;
            if (logChannelId) {
                const fetched = await message.guild.channels.fetch(logChannelId).catch(() => null);
                if (fetched) logChannel = fetched;
            }

            const cardBuffer = await generateLevelCard(message.member, newLevel);
            const attachment = new AttachmentBuilder(cardBuffer, { name: 'levelup.png' });
            await logChannel.send({ content: `Ascension achieved, ${message.author}.`, files: [attachment] });
        } else {
            await db.client.from('user_levels').update({ xp: newXp })
                .match({ user_id: message.author.id, guild_id: message.guild.id });
        }
    });

    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'rank') {
            const target = interaction.options.getMember('user') ?? interaction.member;
            const user = await getUserData(target.user.id, interaction.guild.id);
            const xpNeeded = getXpForLevel(user.level + 1);

            const embed = new EmbedBuilder()
                .setColor('#1a1a2e')
                .setTitle(`◈ ${target.user.username}'s Standing`)
                .addFields(
                    { name: 'Level', value: `> **${user.level}**`, inline: true },
                    { name: 'Progress', value: `> **${user.xp}** / **${xpNeeded}** XP`, inline: true }
                );
            await interaction.reply({ embeds: [embed] });
        }

        if (interaction.commandName === 'leaderboard') {
            const { data } = await db.client
                .from('user_levels')
                .select('user_id, xp, level')
                .eq('guild_id', interaction.guild.id)
                .order('level', { ascending: false })
                .order('xp', { ascending: false })
                .limit(10);

            const embed = new EmbedBuilder()
                .setColor('#8b0000')
                .setTitle('🏆 𝕿𝖍𝖊 𝕬𝖇𝖞𝖘𝖘 𝕷𝖊𝖆𝖉𝖊𝖗𝖇𝖔𝖆𝖗𝖉')
                .setDescription(data?.map((r, i) => `**${i+1}.** <@${r.user_id}> • Lvl ${r.level}`).join('\n') || 'The void is empty.');
            await interaction.reply({ embeds: [embed] });
        }

        if (interaction.commandName === 'setlevel') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Forbidden.', flags: [64] });
            const target = interaction.options.getUser('user');
            const newLevel = interaction.options.getInteger('level');
            
            await db.client.from('user_levels').update({ level: newLevel, xp: 0 })
                .match({ user_id: target.id, guild_id: interaction.guild.id });
                
            await interaction.reply({ content: `✅ **${target.username}** ascended to **Level ${newLevel}**.` });
        }
    });
};