const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = (client) => {
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('guardian_')) return;

        // Ensure only mods can click these buttons
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: "❌ You lack the authority to execute this action.", ephemeral: true });
        }

        const parts = interaction.customId.split('_');
        const action = parts[1]; // 'ban' or 'dismiss'
        const targetUserId = parts[2];

        if (action === 'ban') {
            try {
                const targetMember = await interaction.guild.members.fetch(targetUserId);
                await targetMember.ban({ reason: "Banned by Guardian Tribunal" });

                const successEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor('#000000')
                    .setTitle('⚖️ TRIBUNAL EXECUTED: Subject Banned')
                    .setFooter({ text: `Executed by ${interaction.user.tag}` });

                await interaction.update({ embeds: [successEmbed], components: [] });

                // Reset strikes after ban so they start fresh if unbanned later
                await db.client
                    .from('user_strikes')
                    .delete()
                    .match({ guild_id: interaction.guild.id, user_id: targetUserId });

            } catch (error) {
                await interaction.reply({ content: "❌ Failed to ban the subject. My hierarchy may be too low.", ephemeral: true });
            }
        } 
        
        if (action === 'dismiss') {
            const dismissedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#2f3136')
                .setTitle('🛡️ TRIBUNAL DISMISSED')
                .setFooter({ text: `Dismissed by ${interaction.user.tag}` });

            await interaction.update({ embeds: [dismissedEmbed], components: [] });
        }
    });
};