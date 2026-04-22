# 🌑 The Abyss: Advanced Discord Ecosystem

A modular, high-performance Discord bot ecosystem designed for server management, behavioral logging, and AI-driven interaction.

## Overview
**The Abyss** is a backend-focused Discord application that showcases a scalable approach to bot development. It utilizes a modular handler architecture and real-time database synchronization via Supabase to provide a robust experience for large-scale communities.

## Key Technical Implementations
* **Modular Architecture**: Logic is decoupled into dedicated handlers (moderation, logging, AI, leveling) for better maintainability.
* **Database Persistence**: Uses Supabase (PostgreSQL) for real-time storage of server configurations, user streaks, and social bonds.
* **Comprehensive Logging**: Real-time monitoring of message edits/deletes, voice state changes, and member updates.
* **AI Integration**: Custom-built AI personality engine with server-specific caching and usage throttling.

## Tech Stack
* **Language**: Node.js
* **Library**: Discord.js v14
* **Database**: Supabase / PostgreSQL
* **Server**: Express (Heartbeat & Health Checks)

## ⚙️ Core Commands
* `/config`: Map bot features to specific channels.
* `/setpersonality`: Define the AI's behavior via custom system prompts.
* `/lockdown`: Administrative server-sealing logic.
* `/tree`: Visualizes user relationship bonds stored in the DB.

## Academic Context
This project was developed to demonstrate backend engineering skills, specifically focusing on event-driven architecture and cloud database integration. It highlights my ability to manage complex state across distributed sessions.


nstallation & Setup
To run The Abyss in your own environment for testing, follow these steps:

1. Prerequisites
Node.js (v16.11.0 or higher)

npm or yarn

A Supabase account (PostgreSQL)

A Discord Developer application

2. Clone and Install
npm install
4. Environment Variables
Create a .env file in the root directory and populate it with your credentials:

Code snippet
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_test_server_id
DATABASE_URL=your_supabase_postgresql_url
DATABASE_KEY=your_supabase_anon_key
4. Database Schema
Ensure your Supabase instance has a table named config with the following columns:

guild_id (Text)

feature (Text)

channel_id (Text)

Primary Key: (guild_id, feature)

5. Deployment
Sync your slash commands with Discord's API:

node deploy-commands.js
Then, start the void:

Bash
node index.js
⚙️ Testing the Features
Once the bot is online in your test server, use these commands to verify the integration:

Map the Logs:  /config feature:Message Logs channel:#your-log-channel

Verify Database Write: Delete a message in any channel. Check your #your-log-channel to see the embed and check your Supabase dashboard to see the new row.

AI Personality: /setpersonality prompt:You are a helpful assistant.
Tag the bot or use its trigger to see it respond using your custom prompt from the DB.
