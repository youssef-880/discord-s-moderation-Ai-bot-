const { Events } = require('discord.js');

module.exports = (client) => {
  client.once(Events.ClientReady, (c) => {
    console.log(`✅ Logged in as ${c.user.tag}`);
    
    // Set a custom status for the bot
    client.user.setActivity('The Abyss', { type: 3 }); // 3 is "Watching"
  });
};