const { EmbedBuilder, Events } = require('discord.js');
const db = require('../database'); // Cloud connection
const axios = require('axios');

// All your added cusses included here
const SWEAR_WORDS = [
    'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'pussy', 'faggot', 'nigger', 
    'retard', 'bastard', 'slut', 'whore', 'motherfucker', 'mf', 'tf', 'wtf', 'damn',
];

// ─── SOULS-THEMED GIPHY HELPER ─────────────────────────────
async function getSoulsPunishmentGif() {
    const tags = [
        'dark souls punch', 
        'elden ring critical hit', 
        'bloodborne silence', 
        'dark souls point down', 
        'elden ring mad', 
        'dark souls parry',
        'dark souls angry'
    ];
    const randomTag = tags[Math.floor(Math.random() * tags.length)];

    try {
        const response = await axios.get(`https://api.giphy.com/v1/gifs/random`, {
            params: {
                api_key: process.env.GIPHY_API_KEY,
                tag: randomTag,
                rating: 'pg-13'
            }
        });
        return response.data.data.images.original.url;
    } catch (error) {
        console.error('🌑 Giphy Error:', error.message);
        return null;
    }
}

module.exports = (client) => {

    // ─── MONITOR CHAT ───────────────────────────────────────
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot || !message.guild || message.content.startsWith('!')) return;

        const content = message.content.toLowerCase();
        
        // Check if the message contains any of the swear words
        const hasSwear = SWEAR_WORDS.some(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(content);
        });

        if (hasSwear) {
            // Database Logic: Fetch current count
            const res = await db.query(
                'SELECT count FROM swear_jar WHERE user_id = $1 AND guild_id = $2', 
                [message.author.id, message.guild.id]
            );
            
            let count = res.rows[0] ? parseInt(res.rows[0].count) + 1 : 1;

            // Update or Insert into Cloud
            await db.query(
                `INSERT INTO swear_jar (user_id, guild_id, count) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT(user_id, guild_id) 
                 DO UPDATE SET count = EXCLUDED.count`,
                [message.author.id, message.guild.id, count]
            );

            const isMilestone = count % 10 === 0;

            const embed = new EmbedBuilder()
                .setColor(isMilestone ? '#ff0000' : '#4a0000')
                .setTitle(isMilestone ? '𖤐  JUDGMENT PASSED' : '🪙  Coin for the Jar')
                .setDescription(
                    isMilestone 
                        ? `The Abyss has no patience for your filth, ${message.author}. **${count} swears** reached.` 
                        : `${message.author}, watch your tongue. Your debt grows to **${count} coins**.`
                );

            if (isMilestone) {
                const soulsGif = await getSoulsPunishmentGif();
                if (soulsGif) embed.setImage(soulsGif);
            }

            // Sends directly to the channel the user cussed in
            await message.channel.send({ embeds: [embed] }).catch(() => {});
        }
    });

    // ─── /SWEARCOUNT COMMAND ────────────────────────────────
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'swearcount') return;

        const target = interaction.options.getUser('user') ?? interaction.user;
        
        const res = await db.query(
            'SELECT count FROM swear_jar WHERE user_id = $1 AND guild_id = $2', 
            [target.id, interaction.guild.id]
        );

        const count = res.rows[0] ? res.rows[0].count : 0;

        const embed = new EmbedBuilder()
            .setColor('#1a1a2e')
            .setTitle(`◆  ${target.username}'s Swear Debt`)
            .setDescription(`${target.username} has dropped **${count}** coins into the swear jar.`)
            .setFooter({ text: 'The Abyss expects refinement.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    });
};