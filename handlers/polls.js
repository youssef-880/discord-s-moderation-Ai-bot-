const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');

const pollData = new Map();

module.exports = (client) => {
    client.on(Events.InteractionCreate, async (interaction) => {
        
        if (interaction.isChatInputCommand() && interaction.commandName === 'poll') {
            const question = interaction.options.getString('question');
            const durationHours = interaction.options.getInteger('duration');
            const options = [
                interaction.options.getString('option1'),
                interaction.options.getString('option2'),
                interaction.options.getString('option3'),
                interaction.options.getString('option4')
            ].filter(Boolean);

            // Calculate end time: current time + (hours * 3600 seconds)
            const endTime = Math.floor(Date.now() / 1000) + (durationHours * 3600);
            
            const embed = new EmbedBuilder()
                .setTitle(`📊 ${question}`)
                .setDescription(options.map(opt => `**${opt}**\n\`░░░░░░░░░░\` 0% (0)`).join('\n\n'))
                .addFields({ name: '⏱️ Closes', value: `<t:${endTime}:R>`, inline: true })
                .setColor('#2f3136')
                .setFooter({ text: 'Total Votes: 0 • One vote per soul' });

            const row = new ActionRowBuilder();
            options.forEach((opt, index) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poll_${index}`)
                        .setLabel(opt)
                        .setStyle(ButtonStyle.Secondary)
                );
            });

            const pollMessage = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            // Store poll state
            pollData.set(pollMessage.id, { votes: {}, options });

            // Disable buttons after the duration expires
            setTimeout(async () => {
                const fetchedMsg = await interaction.channel.messages.fetch(pollMessage.id).catch(() => null);
                if (fetchedMsg) {
                    const disabledRow = new ActionRowBuilder();
                    fetchedMsg.components[0].components.forEach(btn => {
                        disabledRow.addComponents(ButtonBuilder.from(btn).setDisabled(true));
                    });
                    
                    const finalEmbed = EmbedBuilder.from(fetchedMsg.embeds[0])
                        .setFields({ name: '⏱️ Status', value: 'This poll has concluded.', inline: true });

                    await fetchedMsg.edit({ embeds: [finalEmbed], components: [disabledRow] }).catch(() => {});
                }
                pollData.delete(pollMessage.id);
            }, durationHours * 3600000); // Hours to milliseconds
        }

        if (interaction.isButton() && interaction.customId.startsWith('poll_')) {
            const messageId = interaction.message.id;
            const userId = interaction.user.id;
            const optionIndex = parseInt(interaction.customId.split('_')[1]);

            if (!pollData.has(messageId)) {
                return interaction.reply({ content: "This poll is no longer accepting votes.", ephemeral: true });
            }

            const currentPoll = pollData.get(messageId);
            
            if (currentPoll.votes[userId] !== undefined) {
                return interaction.reply({ content: "You have already cast your vote in this poll.", ephemeral: true });
            }

            // Register vote
            currentPoll.votes[userId] = optionIndex;
            
            const totalVotes = Object.keys(currentPoll.votes).length;
            const counts = currentPoll.options.map((_, i) => 
                Object.values(currentPoll.votes).filter(v => v === i).length
            );

            // Progress Bar Logic
            const newDescription = currentPoll.options.map((opt, i) => {
                const percent = totalVotes === 0 ? 0 : Math.round((counts[i] / totalVotes) * 100);
                const filledCount = Math.floor(percent / 10);
                const progress = '█'.repeat(filledCount) + '░'.repeat(10 - filledCount);
                return `**${opt}**\n\`${progress}\` ${percent}% (${counts[i]})`;
            }).join('\n\n');

            const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(newDescription)
                .setFooter({ text: `Total Votes: ${totalVotes} • One vote per soul` });

            await interaction.update({ embeds: [newEmbed] });
        }
    });
};