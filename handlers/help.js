const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    Events, 
    MessageFlags 
} = require('discord.js');

module.exports = (client) => {
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'help') return;

        const mainEmbed = new EmbedBuilder()
            .setColor('#1a1a2e')
            .setTitle('◈ THE ABYSS | ARCHIVES')
            .setDescription(
                "Welcome, Traveler. This bot is a multi-purpose tool designed for **The Abyss** community. " +
                "It manages levels, tracks sins (swears), and delivers daily intellectual transmissions.\n\n" +
                "**Select a category below to view specific commands.**"
            )
            .addFields(
                { name: '🛡️ Moderation', value: 'Keep the void orderly.', inline: true },
                { name: '⚔️ Leveling', value: 'Track your soul\'s growth.', inline: true },
                { name: '📝 Logging', value: 'Monitoring the unseen.', inline: true }
            )
            .setFooter({ text: 'Use the menu below to navigate.' });

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_menu')
                .setPlaceholder('Select a category...')
                .addOptions([
                    { label: 'General & Info', value: 'help_general', emoji: '🌐' },
                    { label: 'Leveling & Streaks', value: 'help_levels', emoji: '⚔️' },
                    { label: 'Moderation', value: 'help_mod', emoji: '🛡️' },
                    { label: 'Daily Systems', value: 'help_daily', emoji: '⏳' },
                    { label: 'Logging & Logs', value: 'help_logs', emoji: '📝' },
                    { label: 'The Swear Jar', value: 'help_jar', emoji: '🪙' }
                ])
        );

        await interaction.reply({ embeds: [mainEmbed], components: [menu], flags: [MessageFlags.Ephemeral] });
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'help_menu') return;

        const category = interaction.values[0];
        const embed = new EmbedBuilder().setColor('#8b0000');

        switch (category) {
            case 'help_general':
                embed.setTitle('🌐 General Commands')
                    .addFields(
                        { name: '/help', value: 'Shows this guide.' },
                        { name: '/config', value: 'Assign channels to features (Admin).' },
                        { name: '/settings', value: 'View current server configuration.' },
                        { name: '/say', value: 'Send a message as the bot.' },
                        { name: '/setdescription', value: 'Set a persistent message in a channel.' }
                    );
                break;
            case 'help_levels':
                embed.setTitle('⚔️ Leveling & Streaks')
                    .addFields(
                        { name: '/rank', value: 'Check your current level and XP.' },
                        { name: '/leaderboard', value: 'See the most powerful souls.' },
                        { name: '/streak', value: 'View your daily activity streak.' }
                    );
                break;
            case 'help_mod':
                embed.setTitle('🛡️ Moderation Tools')
                    .addFields(
                        { name: '/ban /kick', value: 'Remove unwanted entities.' },
                        { name: '/mute /unmute', value: 'Silence disruptions.' },
                        { name: '/warn /warnings', value: 'Issue and track warnings.' },
                        { name: '/lockdown', value: 'Seal the server from new joins.' }
                    );
                break;
            case 'help_daily':
                embed.setTitle('⏳ Daily Systems (AI)')
                    .setDescription('Transmissions begin at 6:00 AM EST.')
                    .addFields(
                        { name: '/setdailyrole', value: 'Set role pings for categories.' },
                        { name: '/testdaily', value: 'Manually summon a daily post.' }
                    );
                break;
            case 'help_logs':
                embed.setTitle('📝 Logging & Monitoring')
                    .setDescription('The bot silently watches the void for changes.')
                    .addFields(
                        { name: 'Message Logs', value: 'Tracks edits and deletions. Set via `/config feature:message-logs`.' },
                        { name: 'Join Logs', value: 'Tracks new arrivals. Set via `/config feature:join-logs`.' },
                        { name: 'Mod Logs', value: 'Tracks administrative actions. Set via `/config feature:mod-logs`.' }
                    );
                break;
            case 'help_jar':
                embed.setTitle('🪙 The Swear Jar')
                    .addFields(
                        { name: '/swearcount', value: 'Check your current sin debt.' },
                        { name: 'Auto-Jar', value: 'Detects profanity and adds coins to your profile.' }
                    );
                break;
        }

        await interaction.update({ embeds: [embed] });
    });
};