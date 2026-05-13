const cron = require('node-cron');
const db = require('../database');
const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    // This runs every minute to check if any tasks are due
    cron.schedule('* * * * *', async () => {
        const currentTime = new Date().toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });

        // 1. Fetch all scheduled tasks from DB
        const { data: tasks, error } = await db.client
            .from('daily_content')
            .select('*')
            .eq('scheduled_time', currentTime);

        if (error || !tasks) return;

        for (const task of tasks) {
            const guild = client.guilds.cache.get(task.guild_id);
            const channel = guild?.channels.cache.get(task.channel_id);
            if (!channel) continue;

            // 2. Fetch content based on category
            const content = await fetchContent(task.category);
            
            const embed = new EmbedBuilder()
                .setTitle(`📅 Daily ${task.category.toUpperCase()}`)
                .setDescription(content.text)
                .setColor('#1a1a2e')
                .setTimestamp();

            if (content.image) embed.setImage(content.image);

            channel.send({ embeds: [embed] });
        }
    });
};

// Helper to get the actual data (you can expand this)
async function fetchContent(category) {
    if (category === 'memes') {
        // You could use a meme API or a specific subreddit
        return { text: "Here is your daily dose of the void.", image: "https://meme-api.com/gimme" };
    }
    if (category === 'tech') {
        return { text: "Today's Tech Insight: Always use .gitignore." };
    }
    return { text: "Default daily update." };
}