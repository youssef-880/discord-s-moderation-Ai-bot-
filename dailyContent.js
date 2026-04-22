const { EmbedBuilder, Events, MessageFlags } = require('discord.js');
const cron = require('node-cron');
const Groq = require('groq-sdk');
const Database = require('better-sqlite3');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const db = new Database('abyss.db');

// Ensure database table exists
db.exec(`CREATE TABLE IF NOT EXISTS daily_roles (
    feature TEXT PRIMARY KEY,
    roleId TEXT
)`);

// ─── AI GENERATOR FUNCTION ────────────────────────────────
async function generateGroqContent(category) {
    const prompts = {
        psychology: "Provide a detailed clinical psychology fact about a disorder or behavioral concept. Make it educational and professional.",
        gaming: "Search for the latest viral gaming news or upcoming game releases. Provide a summary and a link.",
        debate: "Propose a thought-provoking and neutral debate topic for a community discussion.",
        philosophy: "Share a deep philosophical quote followed by a question that makes people reflect on their life.",
        resources: "Find a real-time link to a clinical psychology article, a research paper, or a helpful developer resource."
    };

    try {
        console.log(`🔮 Oracle is consulting the void for: ${category}...`);
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "You are the Oracle of The Abyss. You provide dark-themed, intellectual, and accurate daily transmissions. Always include real, working links for gaming and resources." 
                },
                { role: "user", content: prompts[category] }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
        });
        return completion.choices[0]?.message?.content || "The void is silent today.";
    } catch (error) {
        console.error("❌ Groq API Error:", error.message);
        return "The connection to the Oracle was severed.";
    }
}

module.exports = (client) => {
    const { getConfigChannel } = require('./config');

    // ─── SCHEDULER LOGIC ───────────────────────────────────
    const scheduleContent = (cronTime, feature, title, color, categoryKey) => {
        // Set timezone to Asia/Riyadh for 4 PM local time
        cron.schedule(cronTime, async () => {
            client.guilds.cache.forEach(async (guild) => {
                const channelId = getConfigChannel(guild.id, feature);
                if (!channelId) return;

                const channel = guild.channels.cache.get(channelId);
                if (!channel) return;

                const roleData = db.prepare('SELECT roleId FROM daily_roles WHERE feature = ?').get(feature);
                const mention = roleData ? `<@&${roleData.roleId}>` : "";

                const content = await generateGroqContent(categoryKey);

                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(`◈ ${title}`)
                    .setDescription(content)
                    .setFooter({ text: 'Daily Transmission | The Abyss' })
                    .setTimestamp();

                await channel.send({ content: mention, embeds: [embed] });
            });
        }, {
            scheduled: true,
            timezone: "Asia/Riyadh"
        });
    };

    // Scheduled for 16:00 (4:00 PM) Riyadh Time
    // We stagger them by 2 minutes so the API doesn't rate limit you
    scheduleContent('0 16 * * *', 'daily-psychology', '🧠 Psychology Insight', '#5d3fd3', 'psychology');
    scheduleContent('2 16 * * *', 'daily-gaming', '🎮 Gaming Transmission', '#1e90ff', 'gaming');
    scheduleContent('4 16 * * *', 'daily-debate', '🗣️ The Great Debate', '#ff4500', 'debate');
    scheduleContent('6 16 * * *', 'daily-philosophy', '📚 Philosophical Void', '#708090', 'philosophy');
    scheduleContent('8 16 * * *', 'daily-resources', '📖 Collected Resources', '#2e8b57', 'resources');

    // ─── INTERACTION HANDLER ───────────────────────────────
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'setdailyrole') {
            const feature = interaction.options.getString('feature');
            const role = interaction.options.getRole('role');
            
            db.prepare('INSERT OR REPLACE INTO daily_roles (feature, roleId) VALUES (?, ?)').run(feature, role.id);
            
            await interaction.reply({ 
                content: `✅ Role ${role} will now be pinged for **${feature}**.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (interaction.commandName === 'testdaily') {
            const feature = interaction.options.getString('feature');

            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const channelId = getConfigChannel(interaction.guild.id, feature);
            if (!channelId) {
                return interaction.editReply(`❌ No channel assigned to **${feature}**. Use \`/config\` first.`);
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) return interaction.editReply(`❌ Target channel not found.`);

            try {
                const categoryKey = feature.replace('daily-', '');
                const content = await generateGroqContent(categoryKey);

                const roleData = db.prepare('SELECT roleId FROM daily_roles WHERE feature = ?').get(feature);
                const mention = roleData ? `<@&${roleData.roleId}>` : "";

                const embed = new EmbedBuilder()
                    .setColor('#2e8b57')
                    .setTitle(`◈ Manual Transmission: ${categoryKey.toUpperCase()}`)
                    .setDescription(content)
                    .setTimestamp();

                await channel.send({ content: mention, embeds: [embed] });
                await interaction.editReply(`✅ Successfully summoned the Oracle! Check ${channel}.`);
            } catch (err) {
                await interaction.editReply(`❌ Critical error during transmission.`);
            }
        }
    });
};