/**
 * WELCOME & LEAVE SYSTEM - THE ABYSS
 * Logic: Greets new souls and logs departures/bans using Cloud Config.
 */

const { EmbedBuilder, Events } = require('discord.js');
const fetch = require('node-fetch');
// Import the config handler to pull channel IDs from Supabase
const { getConfigChannel } = require('./config');

/**
 * Fetches a random GIF from Giphy based on the Abyss aesthetic.
 */
async function getGif(searchTerm) {
    try {
        const res = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${process.env.GIPHY_API_KEY}&tag=${encodeURIComponent(searchTerm)}&rating=pg`);
        const data = await res.json();
        return data.data?.images?.original?.url || null;
    } catch (err) { return null; }
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── LORE POOLS ──────────────────────────────────────────
const welcomeIntros = [
    "The heavy iron gates of The Abyss groan as they swing wide...",
    "A thick fog parts, revealing a new silhouette standing at the threshold...",
    "The eternal flame flickers. A new spark has entered the depths...",
    "The Watchers shift their gaze. A new soul has been weighed and accepted..."
];

const welcomeLore = [
    "**{user}**, you have wandered far from the light. Here, the shadows offer no judgment, only truth.",
    "Behold, **{user}** has crossed the point of no return. The Abyss has been expecting your arrival.",
    "The journey was long, but **{user}** has finally found the home of the lost. Step into the cold embrace.",
    "Another echo joins the chorus of the void. Welcome, **{user}**, to the place where time stands still."
];

module.exports = (client) => {

    // ─── ARRIVAL (JOIN EVENT) ─────────────────────────────
    client.on(Events.GuildMemberAdd, async (member) => {
        // NOTE: We MUST use 'await' here because getConfigChannel now queries Supabase Cloud.
        const chanId = await getConfigChannel(member.guild.id, 'arrivals');
        
        if (!chanId) return; // Exit if no welcome channel is configured
        
        const channel = await member.guild.channels.fetch(chanId).catch(() => null);
        if (!channel) return;

        // Fetch other relevant channel IDs for the "Path Ahead" field
        const rulesId = await getConfigChannel(member.guild.id, 'rules');
        const introId = await getConfigChannel(member.guild.id, 'introductions');
        
        const gif = await getGif('dark souls farron keep');

        const embed = new EmbedBuilder()
            .setColor('#1a1a2e')
            .setTitle('𝕿𝖍𝖊 𝕬𝖇𝖞𝖘𝖘 — 𝕬 𝕾𝖔𝖚𝖑 𝕬𝖗𝖗𝖎𝖛𝖊𝖘')
            .setDescription(`\n*${pick(welcomeIntros)}*\n\n${pick(welcomeLore).replace('{user}', member.user.username)}`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '⚔ 𝕴𝖉𝖊𝖓𝖙𝖎𝖙𝖞', value: `> ${member}`, inline: true },
                { name: '◍ 𝕾𝖔𝖚𝖑 𝕮𝖔𝖚𝖓𝖙', value: `> ${member.guild.memberCount}`, inline: true },
                { name: '◈ 𝕿𝖍𝖊 𝕻𝖆𝖙𝖍 𝕬𝖍𝖊𝖆𝖉', value: `Visit <#${rulesId || 'rules'}> to learn our laws and introduce your soul in <#${introId || 'intros'}>.` }
            )
            .setImage(gif)
            .setFooter({ text: 'The Abyss — Where the lost find each other.' })
            .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => null);
    });

    // ─── DEPARTURE & BAN (LEAVE EVENT) ────────────────────
    client.on(Events.GuildMemberRemove, async (member) => {
        // NOTE: Awaiting the 'departures' channel ID from the cloud database.
        const chanId = await getConfigChannel(member.guild.id, 'departures');
        
        if (!chanId) return;
        
        const channel = await member.guild.channels.fetch(chanId).catch(() => null);
        if (!channel) return;

        // Check if the departure was actually a Ban
        const bans = await member.guild.bans.fetch().catch(() => new Map());
        const isBanned = bans.has(member.id);

        const embed = new EmbedBuilder();

        if (isBanned) {
            const gif = await getGif('judgment dark knight');
            embed.setColor('#8b0000')
                 .setTitle('⛓️ 𝕭𝖆𝖓𝖎𝖘𝖍𝖊𝖉 𝕱𝖗𝖔𝖒 𝕿𝖍𝖊 𝕬𝖇𝖞𝖘𝖘')
                 .setDescription(`\n**${member.user.username}** has been weighed, measured, and found wanting. They have been cast out into the outer darkness.\n\n*Justice is swift. The void remains pure.*`)
                 .setImage(gif);
        } else {
            const gif = await getGif('dark fantasy forest fog');
            embed.setColor('#050505')
                 .setTitle('🌑 𝖁𝖆𝖓𝖎𝖘𝖍𝖊𝖉 𝕴𝖓𝖙𝖔 𝕿𝖍𝖊 𝖁𝖔𝖎𝖉')
                 .setDescription(`\n**${member.user.username}** has vanished into the mist. Their presence fades like an echo in a hollow chamber.\n\n*The Abyss takes back what was lent. Silence returns.*`)
                 .setImage(gif);
        }

        embed.setThumbnail(member.user.displayAvatarURL({ size: 256 }))
             .setFooter({ text: 'The Abyss — Nothing lasts forever.' })
             .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => null);
    });
};