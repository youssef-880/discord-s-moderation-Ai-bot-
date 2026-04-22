require('dotenv').config();
const { REST, Routes } = require('discord.js');

// 1. Manually list your core commands here for the test
const commands = [
  { name: 'config', description: 'Configure the Abyss' },
  { name: 'setup', description: 'Setup channels' },
  { name: 'rank', description: 'Check XP standing' }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🌑 Refreshing Guild (/) commands...');
    
    // Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('✅ Commands are now LIVE in your test server!');
  } catch (error) {
    console.error(error);
  }
})();