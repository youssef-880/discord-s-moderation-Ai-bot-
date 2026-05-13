const { EmbedBuilder, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const Groq = require('groq-sdk');
const db = require('../database');
const { getConfigChannel } = require('./config');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Bypasses the AI check to save API calls
const IGNORED_PREFIXES = ['!', '/', '?']; 

async function analyzeBehavior(content) {
    if (!content || content.length < 3) return { toxic: false };

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are a clinical behavioral analysis system. Evaluate the following text for severe hostility, slurs, explicit NSFW content, or aggressive spam. Respond ONLY with a valid JSON object: {"toxic": true/false, "reason": "Short clinical explanation if true"}. Do not include any other text.` 
                },
                { role: "user", content: content }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content);
        return result;
    } catch (error) {
        console.error("🌑 Guardian AI Error:", error);
        return { toxic: false };
    }
}

module.exports = (client) => {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot || !message.guild) return;
        
        // ─── 1. FETCH DYNAMIC SETTINGS ───
        // Default values in case the database entry doesn't exist yet
        let settings = {
            banned_gifs: ['nsfw', 'gore', 'blood', 'sexy', 'violence', 'leaked', 'adult'],
            banned_links: ['http://', 'https://', 'discord.gg/']
        };

        const { data: dbSettings } = await db.client
            .from('guardian_settings')
            .select('*')
            .eq('guild_id', message.guild.id)
            .single();

        if (dbSettings) settings = dbSettings;

        // ─── 2. BYPASS CHECK ───
        // Replace with your actual IDs or keep as is if using names
        const MASTER_ROLE_ID = 'YOUR_MASTER_ROLE_ID'; 
        const PREMIUM_ROLE_ID = 'YOUR_PREMIUM_ROLE_ID'; 
        
        const isExempt = message.member.permissions.has(PermissionFlagsBits.ManageMessages) || 
                         message.member.roles.cache.has(MASTER_ROLE_ID) || 
                         message.member.roles.cache.has(PREMIUM_ROLE_ID);
        
        if (isExempt) return;

        const content = message.content.toLowerCase();
        let violationReason = null;

        // ─── 3. SMART MEDIA & LINK GUARD ───
        const isGif = content.includes('tenor.com') || content.includes('giphy.com') || content.includes('.gif') || 
                      message.attachments.some(att => att.contentType?.includes('image/gif'));

        if (isGif) {
            // Check if the GIF URL contains any "bad" words from settings
            const isBadGif = settings.banned_gifs.some(tag => content.includes(tag));
            if (isBadGif) violationReason = "Graphic/NSFW GIF Transmission";
        } else if (settings.banned_links.some(link => content.includes(link))) {
            // Check against dynamic link blacklist
            violationReason = "Unauthorized Link/Scam Prevention";
        }

        // ─── 4. AI BEHAVIORAL ANALYSIS ───
        // Only run AI if no manual violation was found and message isn't a command
        if (!violationReason && !isGif && !IGNORED_PREFIXES.some(prefix => content.startsWith(prefix))) {
            const analysis = await analyzeBehavior(message.content);
            if (analysis.toxic) {
                violationReason = analysis.reason;
            }
        }

        // ─── 5. ENFORCEMENT & LOGGING ───
        if (violationReason) {
            await message.delete().catch(() => {});

            // Record the strike
            await db.query(
                'INSERT INTO guardian_strikes (guild_id, user_id, reason) VALUES ($1, $2, $3)',
                [message.guild.id, message.author.id, violationReason]
            );

            // Fetch total count for escalation
            const strikeCheck = await db.query(
                'SELECT COUNT(*) as count FROM guardian_strikes WHERE guild_id = $1 AND user_id = $2',
                [message.guild.id, message.author.id]
            );
            
            const currentStrikes = parseInt(strikeCheck.rows[0].count);

            // Notify Mod Logs for every deletion
            const modLogsId = await getConfigChannel(message.guild.id, 'mod-logs');
            const modChannel = modLogsId ? await message.guild.channels.fetch(modLogsId).catch(() => null) : null;

            if (modChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setAuthor({ name: 'Guardian Deletion', iconURL: message.author.displayAvatarURL() })
                    .setDescription(`**User:** <@${message.author.id}>\n**Reason:** ${violationReason}\n**Strikes:** ${currentStrikes}`)
                    .setTimestamp();
                await modChannel.send({ embeds: [logEmbed] });
            }

            // ─── 6. ESCALATION LOGIC ───
            if (currentStrikes === 1) {
                const warnEmbed = new EmbedBuilder()
                    .setColor('#ffcc00')
                    .setTitle('◈ Behavioral Warning')
                    .setDescription(`<@${message.author.id}>, your message was purged.\n**Reason:** ${violationReason}\n\n*The Abyss marks this transgression.*`);
                
                const warnMsg = await message.channel.send({ content: `<@${message.author.id}>`, embeds: [warnEmbed] });
                setTimeout(() => warnMsg.delete().catch(() => {}), 10000);
            } 
            else if (currentStrikes === 2) {
                try {
                    await message.member.timeout(10 * 60 * 1000, `Guardian Auto-Mute: ${violationReason}`);
                    const muteEmbed = new EmbedBuilder()
                        .setColor('#ff4500')
                        .setTitle('◈ Isolation Enforced')
                        .setDescription(`<@${message.author.id}> has been temporarily isolated for repeated violations.`);
                    await message.channel.send({ embeds: [muteEmbed] });
                } catch (err) {
                    console.error("Timeout Error:", err);
                }
            } 
            else if (currentStrikes >= 3 && modChannel) {
                // Tribunal for high-risk users
                const tribunalEmbed = new EmbedBuilder()
                    .setColor('#8b0000')
                    .setTitle('🚨 TRIBUNAL REQUIRED')
                    .addFields(
                        { name: 'Subject', value: `<@${message.author.id}>`, inline: true },
                        { name: 'Strikes', value: `${currentStrikes}`, inline: true },
                        { name: 'Last Violation', value: violationReason }
                    )
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`guardian_ban_${message.author.id}`).setLabel('Ban Subject').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`guardian_dismiss_${message.author.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Secondary)
                );

                await modChannel.send({ embeds: [tribunalEmbed], components: [row] });
            }
        }
    });
};