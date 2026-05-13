const { EmbedBuilder, Events, MessageFlags } = require('discord.js');
const cron = require('node-cron');
const Groq = require('groq-sdk');
const db = require('../database');
const axios = require('axios');
const moment = require('moment-timezone');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const sentLog = new Set();

// Reset the log at midnight
cron.schedule('0 0 * * *', () => {
    sentLog.clear();
    console.log("◈ [THE ABYSS] Daily transmission log cleared.");
});

async function getMeme() {
    try {
        const res = await axios.get('https://meme-api.com/gimme/wholesomememes');
        return { title: res.data.title, url: res.data.url };
    } catch (e) {
        return { title: "The void has no humor today.", url: null };
    }
}

async function generateGroqContent(category) {
    const prompts = {
        psychology: "Provide a detailed clinical psychology fact. Make it educational and professional.",
        gaming: "Provide a summary of the latest viral gaming news with a link.",
        debate: "Propose a neutral debate topic for community discussion.",
        philosophy: "Share a deep philosophical quote and a reflective question.",
        resources: "Find a real-time link to a psychology article or developer resource."
    };
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are the Oracle of The Abyss. Dark-themed, intellectual transmissions." },
                { role: "user", content: prompts[category] }
            ],
            model: "llama-3.3-70b-versatile",
        });
        return completion.choices[0]?.message?.content || "The void is silent.";
    } catch (error) { return "The connection was severed."; }
}

module.exports = (client) => {
    const { getConfigChannel } = require('./config');

    cron.schedule('* * * * *', async () => {
        console.log(`◈ [THE ABYSS] Heartbeat: Checking schedules at ${moment().format('HH:mm:ss')}...`);

        const features = [
            { id: 'daily-psychology', title: '🧠 Psychology Insight', color: '#5d3fd3', key: 'psychology' },
            { id: 'daily-gaming', title: '🎮 Gaming Transmission', color: '#1e90ff', key: 'gaming' },
            { id: 'daily-debate', title: '🗣️ The Great Debate', color: '#ff4500', key: 'debate' },
            { id: 'daily-philosophy', title: '📚 Philosophical Void', color: '#708090', key: 'philosophy' },
            { id: 'daily-resources', title: '📖 Collected Resources', color: '#2e8b57', key: 'resources' },
            { id: 'daily-memes', title: '🤡 Daily Void Memes', color: '#f1c40f', key: 'memes' }
        ];

        for (const [guildId, guild] of client.guilds.cache) {
            // Optimization: Fetch all config for this guild in one go to prevent lag
            const { data: configs, error } = await db.client
                .from('config')
                .select('feature, channel_id')
                .eq('guild_id', guildId);

            if (error || !configs) continue;

            // Convert to a quick-lookup map
            const configMap = new Map(configs.map(c => [c.feature, c.channel_id]));

            for (const feature of features) {
                const scheduledTime = configMap.get(`time-${feature.id}`);
                const timezone = configMap.get(`tz-${feature.id}`);
                const channelId = configMap.get(feature.id);

                if (!scheduledTime || !timezone || !channelId) continue;

                const currentTime = moment().tz(timezone).format('HH:mm');
                const logKey = `${guildId}-${feature.id}-${moment().tz(timezone).format('YYYY-MM-DD')}`;

                // --- CRITICAL DEBUG LOG ---
                // If you don't see this in your terminal, the loop isn't reaching the time check.
                if (moment().seconds() < 5) { // Only log once per minute
                    console.log(`[CHECK] ${guild.name} | ${feature.id} | Target: ${scheduledTime} | Current: ${currentTime} (${timezone})`);
                }

                if (currentTime === scheduledTime && !sentLog.has(logKey)) {
                    sentLog.add(logKey);
                    
                    try {
                        const channel = await guild.channels.fetch(channelId);
                        if (!channel) continue;

                        console.log(`✅ [MATCH] Sending ${feature.id} to ${guild.name}`);

                        const embed = new EmbedBuilder()
                            .setColor(feature.color)
                            .setTitle(`◈ ${feature.title}`)
                            .setFooter({ text: 'Daily Transmission | The Abyss' })
                            .setTimestamp();

                        if (feature.key === 'memes') {
                            const meme = await getMeme();
                            embed.setTitle(`◈ ${meme.title}`).setImage(meme.url);
                        } else {
                            const content = await generateGroqContent(feature.key);
                            embed.setDescription(content);
                        }

                        await channel.send({ embeds: [embed] });
                    } catch (err) {
                        console.error(`❌ Failed to send ${feature.id}:`, err);
                    }
                }
            }
        }
    });

    // Test command logic remains the same...
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'testdaily') return;
        const feature = interaction.options.getString('feature');
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const channelId = await getConfigChannel(interaction.guild.id, feature);
        if (!channelId) return interaction.editReply("❌ Setup with `/config` first.");
        const categoryKey = feature.replace('daily-', '');
        const embed = new EmbedBuilder().setColor('#2e8b57').setTimestamp();
        if (categoryKey === 'memes') {
            const meme = await getMeme();
            embed.setTitle(meme.title).setImage(meme.url);
        } else {
            const content = await generateGroqContent(categoryKey);
            embed.setTitle(`Manual Oracle Summon: ${categoryKey.toUpperCase()}`).setDescription(content);
        }
        await (await interaction.guild.channels.fetch(channelId)).send({ embeds: [embed] });
        await interaction.editReply(`✅ Transmission sent.`);
    });
};