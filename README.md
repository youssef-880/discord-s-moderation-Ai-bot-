# 🌑 The Abyss: Advanced Discord Ecosystem

A modular, high-performance Discord bot ecosystem designed for server management, behavioral logging, and AI-driven interaction.

## 🚀 Overview
**The Abyss** is a backend-focused Discord application that showcases a scalable approach to bot development. It utilizes a modular handler architecture and real-time database synchronization via Supabase to provide a robust experience for large-scale communities.

## 🛠️ Key Technical Implementations
* **Modular Architecture**: Logic is decoupled into dedicated handlers (moderation, logging, AI, leveling) for better maintainability.
* **Database Persistence**: Uses Supabase (PostgreSQL) for real-time storage of server configurations, user streaks, and social bonds.
* **Comprehensive Logging**: Real-time monitoring of message edits/deletes, voice state changes, and member updates.
* **AI Integration**: Custom-built AI personality engine with server-specific caching and usage throttling.

## 💻 Tech Stack
* **Language**: Node.js
* **Library**: Discord.js v14
* **Database**: Supabase / PostgreSQL
* **Server**: Express (Heartbeat & Health Checks)

## ⚙️ Core Commands
* `/config`: Map bot features to specific channels.
* `/setpersonality`: Define the AI's behavior via custom system prompts.
* `/lockdown`: Administrative server-sealing logic.
* `/tree`: Visualizes user relationship bonds stored in the DB.

## 🎓 Academic Context
This project was developed to demonstrate backend engineering skills, specifically focusing on event-driven architecture and cloud database integration. It highlights my ability to manage complex state across distributed sessions.
