const { Events, PermissionFlagsBits, ChannelType } = require('discord.js');

// Tracking active temp channels and their deletion timeouts
const activeTempChannels = new Map(); 
const MAX_TEMP_CHANNELS = 5;

module.exports = (client) => {

    // 1. Handle the Command
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'privatevc') return;

        // Safety Check: User must be in a voice channel to "spawn" a new one
        const memberVoice = interaction.member.voice.channel;
        if (!memberVoice) {
            return interaction.reply({ content: "You must be in a voice channel to summon a private room.", ephemeral: true });
        }

        // Safety Check: Limit of 5 channels
        if (activeTempChannels.size >= MAX_TEMP_CHANNELS) {
            return interaction.reply({ content: "The void is full. Wait for a room to vanish before creating another.", ephemeral: true });
        }

        const roomName = interaction.options.getString('name');
        const limit = interaction.options.getInteger('limit') || 0;
        const invitedSoul = interaction.options.getUser('invite');

        try {
            const channel = await interaction.guild.channels.create({
                name: `🌑 ${roomName}`,
                type: ChannelType.GuildVoice,
                parent: memberVoice.parentId, 
                userLimit: limit,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.Connect], // Lock for @everyone
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageChannels],
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageChannels],
                    }
                ]
            });

            // Handle the Invite logic
            let responseContent = `Your private sanctuary **${roomName}** has been summoned. It will vanish 5 minutes after the last soul leaves.`;
            let isEphemeral = true; // Default to private if no one is invited

            if (invitedSoul) {
                await channel.permissionOverwrites.edit(invitedSoul.id, {
                    Connect: true,
                    Speak: true,
                    ViewChannel: true // CRITICAL: Guest must be able to see the channel
                });
                
                responseContent += `\n\n👁️ **Invitation Sent:** ${invitedSoul}, you have been granted access to this room.`;
                isEphemeral = false; // Must be public so the guest gets the mention ping
            }

            // Move the creator to the new channel
            await interaction.member.voice.setChannel(channel);

            // Register the channel
            activeTempChannels.set(channel.id, {
                ownerId: interaction.user.id,
                timeout: null
            });

            await interaction.reply({ content: responseContent, ephemeral: isEphemeral });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "Failed to summon the channel. Check my permissions.", ephemeral: true });
        }
    });

    // 2. Handle Auto-Deletion (VoiceStateUpdate)
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        // If someone JOINED a temp channel that was scheduled for deletion, cancel it
        if (newChannel && activeTempChannels.has(newChannel.id)) {
            const data = activeTempChannels.get(newChannel.id);
            if (data.timeout) {
                clearTimeout(data.timeout);
                data.timeout = null;
                console.log(`🌑 Deletion cancelled for ${newChannel.name} (Soul returned)`);
            }
        }

        // If someone LEFT a temp channel
        if (oldChannel && activeTempChannels.has(oldChannel.id)) {
            // Check only for real users (ignoring bots)
            const nonBotMembers = oldChannel.members.filter(m => !m.user.bot);
            
            if (nonBotMembers.size === 0) {
                const data = activeTempChannels.get(oldChannel.id);
                
                // If a timer is already running, don't stack them
                if (data.timeout) return;

                // Start 5 minute timer
                data.timeout = setTimeout(async () => {
                    try {
                        const channelToDelete = await client.channels.fetch(oldChannel.id).catch(() => null);
                        if (channelToDelete) {
                            await channelToDelete.delete();
                            activeTempChannels.delete(oldChannel.id);
                            console.log(`🌑 Temp Room ${oldChannel.id} has vanished.`);
                        }
                    } catch (e) {
                        activeTempChannels.delete(oldChannel.id);
                    }
                }, 300000); 
            }
        }
    });
};