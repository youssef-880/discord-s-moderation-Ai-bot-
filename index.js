require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// ─── 1. HEARTBEAT SERVER ────────────────────────────────────
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).send('𝕿𝖍𝖊 𝕬𝖇𝖞𝖘𝖘 𝖎𝖘 𝖜𝖆𝖙𝖈𝖍𝖎𝖓𝖌...');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🌑 Heartbeat server listening on port ${port}`);
});

// ─── 2. BOT CLIENT SETUP ────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates // 🔥 ADDED: Required for Voice Join/Leave/Move logs
  ],
  // 🔥 REQUIRED for Starboard to work on old messages
  partials: [Partials.Message, Partials.Reaction, Partials.User] 
});

// Increase listeners to prevent the "Memory Leak" warning
client.setMaxListeners(30);

// ─── 3. LOADING HANDLERS ──────────────────────────────────────
const handlers = [
    'ready', 'welcome', 'commands', 'moderation', 'ai', 
    'leveling', 'actions', 'config', 'rules', 'streak', 
    'swearjar', 'dailyContent', 'help', 'logger', 'triggers',
    'sticky', 'family', 'starboard' // 🔥 ADDED Starboard here
];

handlers.forEach(handler => {
    try {
        require(`./handlers/${handler}`)(client);
        console.log(`✅ Loaded handler: ${handler}`);
    } catch (error) {
        console.error(`🌑 Error loading handler [${handler}]:`, error);
    }
});

// ─── 4. GLOBAL ANTI-CRASH ────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
    console.error('🌑 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('🌑 Uncaught Exception:', err);
});

// ─── 5. LOGIN ───────────────────────────────────────────────
client.login(process.env.TOKEN).catch(err => {
  console.error("🌑 Discord Login Error:", err);
});