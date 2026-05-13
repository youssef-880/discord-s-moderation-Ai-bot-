const { EmbedBuilder, AttachmentBuilder, Events } = require('discord.js');
const db = require('../database');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

// Date helpers remain the same
function getDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
const getTodayDate = () => getDateString(new Date());
const getYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getDateString(d);
};
const normalizeDate = (raw) => {
    if (!raw) return null;
    if (raw instanceof Date) return getDateString(raw);
    const match = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
};

async function getUserStreak(userId, guildId) {
    const { data, error } = await db.client
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .eq('guild_id', guildId)
        .single();

    if (data) return data;

    const { data: newUser } = await db.client
        .from('streaks')
        .insert([{ user_id: userId, guild_id: guildId, current_streak: 0, longest_streak: 0 }])
        .select()
        .single();

    return newUser;
}

// generateStreakCard function remains exactly as you had it...
async function generateStreakCard(member, currentStreak, longestStreak) {
    const canvas = createCanvas(800, 250);
    const ctx = canvas.getContext('2d');
    try {
        const assetsPath = path.resolve(__dirname, '../assets');
        const bgFile = fs.readdirSync(assetsPath).find(f => f.startsWith('streak-bg'));
        if (bgFile) {
            const bg = await loadImage(path.join(assetsPath, bgFile));
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        } else { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    } catch { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    try {
        const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'jpg', size: 256 }));
        ctx.save(); ctx.beginPath(); ctx.arc(125, 125, 80, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(avatar, 45, 45, 160, 160); ctx.restore();
    } catch {}
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 36px Arial'; ctx.fillText(member.user.username.toUpperCase(), 240, 90);
    ctx.fillStyle = '#ff0000'; ctx.font = 'bold 50px Arial'; ctx.fillText(`${currentStreak} DAY STREAK`, 240, 155);
    ctx.fillStyle = '#888888'; ctx.font = '18px Arial'; ctx.fillText(`RECORD: ${longestStreak} DAYS`, 240, 195);
    return canvas.toBuffer();
}

module.exports = (client) => {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot || !message.guild || message.content.startsWith('/')) return;
        const today = getTodayDate();
        const yesterday = getYesterdayDate();
        try {
            const user = await getUserStreak(message.author.id, message.guild.id);
            const lastDate = normalizeDate(user.last_active_date);
            if (lastDate === today) return;

            let newStreak = (lastDate === yesterday || lastDate === null) ? (parseInt(user.current_streak) + 1) : 1;
            const isReset = lastDate !== yesterday && lastDate !== null;
            const newLongest = Math.max(newStreak, parseInt(user.longest_streak) || 0);

            await db.client
                .from('streaks')
                .update({ current_streak: newStreak, longest_streak: newLongest, last_active_date: today })
                .eq('user_id', message.author.id)
                .eq('guild_id', message.guild.id);

            const { getConfigChannel } = require('./config');
            const logChannelId = await getConfigChannel(message.guild.id, 'streak');
            if (!logChannelId) return;
            const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
            if (!logChannel) return;

            const cardBuffer = await generateStreakCard(message.member, newStreak, newLongest);
            const attachment = new AttachmentBuilder(cardBuffer, { name: 'streak.png' });
            const embed = new EmbedBuilder().setColor(isReset ? '#4a0000' : '#8b0000').setTitle(isReset ? '🌑 Streak Reset' : '🔥 Streak Renewed').setImage('attachment://streak.png').setTimestamp();
            await logChannel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
        } catch (err) { console.error('❌ Streak Error:', err); }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'streak') return;
        await interaction.deferReply();
        const target = interaction.options.getMember('user') ?? interaction.member;
        try {
            const user = await getUserStreak(target.user.id, interaction.guild.id);
            const isActiveToday = normalizeDate(user.last_active_date) === getTodayDate();
            const cardBuffer = await generateStreakCard(target, user.current_streak, user.longest_streak);
            const attachment = new AttachmentBuilder(cardBuffer, { name: 'streak.png' });
            const embed = new EmbedBuilder().setColor('#1a1a2e').setTitle(`◆ ${target.user.username}'s Streak`).setImage('attachment://streak.png');
            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (err) { await interaction.editReply('❌ Render failed.'); }
    });
};