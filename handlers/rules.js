const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('../database'); // Cloud connection

// ─── HELPERS (Now Asynchronous for Cloud) ──────────────────
async function addRulesRole(guildId, roleId) {
    await db.query(
        'INSERT INTO rules_roles (guild_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', 
        [guildId, roleId]
    );
}

async function removeRulesRole(guildId, roleId) {
    await db.query(
        'DELETE FROM rules_roles WHERE guild_id = $1 AND role_id = $2', 
        [guildId, roleId]
    );
}

async function getRulesRoles(guildId) {
    const res = await db.query('SELECT role_id FROM rules_roles WHERE guild_id = $1', [guildId]);
    return res.rows.map(r => r.role_id);
}

async function setRulesImage(guildId, imageUrl) {
    await db.query(`
        INSERT INTO rules_config (guild_id, image_url)
        VALUES ($1, $2)
        ON CONFLICT(guild_id) DO UPDATE SET image_url = EXCLUDED.image_url
    `, [guildId, imageUrl]);
}

async function setRulesGif(guildId, gifUrl) {
    await db.query(`
        INSERT INTO rules_config (guild_id, welcome_gif)
        VALUES ($1, $2)
        ON CONFLICT(guild_id) DO UPDATE SET welcome_gif = EXCLUDED.welcome_gif
    `, [guildId, gifUrl]);
}

async function getRulesConfig(guildId) {
    const res = await db.query('SELECT * FROM rules_config WHERE guild_id = $1', [guildId]);
    return res.rows[0];
}

// ─── RULES CONTENT (Exactly the same) ──────────────────────
const rules = [
    { num: '1', text: 'Follow Discord\'s ToS and Community Guidelines.' },
    { num: '2', text: 'Show respect to all members at all times. Disrespect will not be tolerated.' },
    { num: '3', text: 'Toxic behavior of any kind is strictly prohibited.' },
    { num: '4', text: 'NSFW or explicit content is not allowed.' },
    { num: '5', text: 'Spamming, flooding, or disrupting conversations is prohibited.' },
    { num: '6', text: 'Advertising or self-promotion (including unsolicited DMs) is not allowed.' },
    { num: '7', text: 'Use the correct channels for their intended purpose.' },
    { num: '8', text: 'Do not mini-moderate — report issues and let staff handle them.' },
    { num: '9', text: 'All members have access to commands — any misuse will result in an immediate command ban.' },
    { num: '10', text: 'Hate speech, slurs, or degrading language is strictly forbidden.' },
    { num: '11', text: 'Do not glorify or encourage self-harm, violence, or harmful behavior.' },
    { num: '12', text: 'Religious and political discussions must remain civil and non-extreme.' },
    { num: '13', text: 'Falsely claiming or faking mental health conditions is not allowed.' },
    { num: '14', text: 'Trolling, provoking, or intentionally causing conflict will result in moderation.' },
    { num: '15', text: 'Do not argue with staff decisions publicly — open a ticket if necessary.' },
];

function buildRulesEmbed(imageUrl) {
    const rulesText = rules.map(r => `**\`${r.num}\`** ◆  ${r.text}`).join('\n\n');
    const embed = new EmbedBuilder()
        .setColor('#1a1a2e')
        .setTitle('𝕿𝖍𝖊 𝕬𝖇𝖞𝖘𝖘 — 𝕾𝖊𝖗𝖛𝖊𝖗 𝕽𝖚𝖑𝖊𝖘')
        .setDescription(
            `*We aim to maintain a respectful and well-structured community.*\n` +
            `*Follow the rules and use common sense at all times.*\n\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
            rulesText +
            `\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
            `*Failure to follow these rules will result in warnings, mutes, or bans depending on severity.*`
        )
        .setFooter({ text: 'The Abyss — Read carefully. Then take your oath below.' })
        .setTimestamp();
    if (imageUrl) embed.setImage(imageUrl);
    return embed;
}

function buildAgreeButton() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('agree_rules')
            .setLabel('I Agree to the Rules')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⚔')
    );
}

module.exports = (client) => {
    client.on('interactionCreate', async interaction => {

        // ─── BUTTON: AGREE TO RULES ─────────────────────────
        if (interaction.isButton() && interaction.customId === 'agree_rules') {
            const roleIds = await getRulesRoles(interaction.guild.id);

            if (roleIds.length === 0) {
                return interaction.reply({ content: '*The abyss has no roles configured yet.*', ephemeral: true });
            }

            try {
                const rolesToAdd = roleIds.filter(id => !interaction.member.roles.cache.has(id));
                if (rolesToAdd.length === 0) {
                    return interaction.reply({ content: '*You have already sworn your oath, soul.*', ephemeral: true });
                }

                await interaction.member.roles.add(rolesToAdd);
                const config = await getRulesConfig(interaction.guild.id);

                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#1a1a2e')
                    .setTitle('⚔  Oath Sworn')
                    .setDescription(`*The abyss acknowledges your oath.*\n\n*Welcome to The Abyss. The darkness welcomes you.*`)
                    .setTimestamp();

                await interaction.reply({ embeds: [welcomeEmbed], ephemeral: true });
                if (config?.welcome_gif) {
                    await interaction.followUp({ content: config.welcome_gif, ephemeral: true });
                }
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '*Something went wrong.*', ephemeral: true });
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        // ─── COMMANDS ───────────────────────────────────────
        if (interaction.commandName === 'setrules') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            
            const { getConfigChannel } = require('./config');
            const channelId = await getConfigChannel(interaction.guild.id, 'rules');

            if (!channelId) return interaction.reply({ content: '❌ Configure a rules channel first.', ephemeral: true });

            const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
            const config = await getRulesConfig(interaction.guild.id);
            const embed = buildRulesEmbed(config?.image_url);
            const row = buildAgreeButton();

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ Rules posted in ${channel}.`, ephemeral: true });
        }

        if (interaction.commandName === 'addrulesrole') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const role = interaction.options.getRole('role');
            await addRulesRole(interaction.guild.id, role.id);
            await interaction.reply({ content: `✅ **${role.name}** added to rules agreement.`, ephemeral: true });
        }

        if (interaction.commandName === 'removerulesrole') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const role = interaction.options.getRole('role');
            await removeRulesRole(interaction.guild.id, role.id);
            await interaction.reply({ content: `✅ **${role.name}** removed.`, ephemeral: true });
        }

        if (interaction.commandName === 'setrulesimage') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const url = interaction.options.getString('url');
            await setRulesImage(interaction.guild.id, url);
            await interaction.reply({ content: `✅ Rules image updated.`, ephemeral: true });
        }

        if (interaction.commandName === 'setrulesgif') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const url = interaction.options.getString('url');
            await setRulesGif(interaction.guild.id, url);
            await interaction.reply({ content: `✅ Welcome GIF updated.`, ephemeral: true });
        }
    });
};