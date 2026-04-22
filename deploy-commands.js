require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { ApplicationCommandOptionType } = require('discord-api-types/v10');

const commands = [
  {
    name: 'ban',
    description: 'Ban a user from the server',
    options: [
      { name: 'user', description: 'The user to ban', type: ApplicationCommandOptionType.User, required: true },
      { name: 'reason', description: 'Reason for the ban', type: ApplicationCommandOptionType.String, required: false }
    ]
  },
  {
    name: 'unban',
    description: 'Unban a user by their ID',
    options: [
      { name: 'userid', description: 'The user ID to unban', type: ApplicationCommandOptionType.String, required: true },
      { name: 'reason', description: 'Reason for the unban', type: ApplicationCommandOptionType.String, required: false }
    ]
  },
  {
    name: 'kick',
    description: 'Kick a user from the server',
    options: [
      { name: 'user', description: 'The user to kick', type: ApplicationCommandOptionType.User, required: true },
      { name: 'reason', description: 'Reason for the kick', type: ApplicationCommandOptionType.String, required: false }
    ]
  },
  {
    name: 'mute',
    description: 'Timeout a user for a set duration',
    options: [
      { name: 'user', description: 'The user to mute', type: ApplicationCommandOptionType.User, required: true },
      { name: 'duration', description: 'Duration in minutes', type: ApplicationCommandOptionType.Integer, required: true },
      { name: 'reason', description: 'Reason for the mute', type: ApplicationCommandOptionType.String, required: false }
    ]
  },
  {
    name: 'unmute',
    description: 'Remove a timeout from a user',
    options: [
      { name: 'user', description: 'The user to unmute', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'warn',
    description: 'Warn a user',
    options: [
      { name: 'user', description: 'The user to warn', type: ApplicationCommandOptionType.User, required: true },
      { name: 'reason', description: 'Reason for the warning', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'warnings',
    description: 'View all warnings for a user',
    options: [
      { name: 'user', description: 'The user to check', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'lockdown',
    description: 'Lock the server to prevent new members from joining'
  },
  {
    name: 'unlockdown',
    description: 'Lift the server lockdown'
  },
  {
    name: 'announce',
    description: 'Send an announcement to the announcements channel',
    options: [
      { name: 'title', description: 'Title of the announcement', type: ApplicationCommandOptionType.String, required: true },
      { name: 'message', description: 'The announcement message', type: ApplicationCommandOptionType.String, required: true },
      { name: 'image', description: 'Image URL for the announcement (optional)', type: ApplicationCommandOptionType.String, required: false }
    ]
  },
  {
    name: 'rank',
    description: 'View your rank and XP in The Abyss',
    options: [
      { name: 'user', description: 'User to check rank for', type: ApplicationCommandOptionType.User, required: false }
    ]
  },
  {
    name: 'leaderboard',
    description: 'View the top souls in The Abyss'
  },
  {
    name: 'setlevel',
    description: 'Manually set a users level (Admin Only)',
    options: [
      { name: 'user', description: 'The user to modify', type: ApplicationCommandOptionType.User, required: true },
      { name: 'level', description: 'The level to set', type: ApplicationCommandOptionType.Integer, required: true }
    ]
  },
  {
    name: 'config',
    description: 'Configure bot channels and settings',
    options: [
      {
        name: 'feature',
        description: 'Which feature to configure',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: 'Arrivals Channel', value: 'arrivals' },
          { name: 'Departures Channel', value: 'departures' },
          { name: 'General Chat', value: 'general' },
          { name: 'Introductions Channel', value: 'introductions' },
          { name: 'Mod Logs Channel', value: 'mod-logs' },
          { name: 'Message Logs', value: 'message-logs' },
          { name: 'Join Logs Channel', value: 'join-logs' },
          { name: 'Level Up Channel', value: 'level-up' },
          { name: 'Announcements Channel', value: 'announcements' },
          { name: 'Oracle Channel', value: 'oracle' },
          { name: 'Rules Channel', value: 'rules' },
          { name: 'Streak Channel', value: 'streak' },
          { name: 'Relationship Announcements', value: 'relationships' },
          { name: 'Daily Psychology', value: 'daily-psychology' },
          { name: 'Daily Gaming', value: 'daily-gaming' },
          { name: 'Daily Debate', value: 'daily-debate' },
          { name: 'Daily Philosophy', value: 'daily-philosophy' },
          { name: 'Daily Resources', value: 'daily-resources' },
          { name: 'Swear Jar Channel', value: 'swear-jar' },
          { name: 'Starboard Channel', value: 'starboard_channel' } // ADDED
        ]
      },
      {
        name: 'channel',
        description: 'The channel to assign to this feature',
        type: ApplicationCommandOptionType.Channel,
        required: true
      }
    ]
  },
  {
    name: 'setstarboardemoji',
    description: 'Set the emoji used for the Starboard',
    options: [
      { name: 'emoji', description: 'The emoji or emoji ID to use', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'settings',
    description: 'View all current bot channel settings'
  },
  {
    name: 'setdailyrole',
    description: 'Set a role to be pinged for daily content',
    options: [
      {
        name: 'feature',
        description: 'The category to set the role for',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: 'Psychology', value: 'daily-psychology' },
          { name: 'Gaming', value: 'daily-gaming' },
          { name: 'Debate', value: 'daily-debate' },
          { name: 'Philosophy', value: 'daily-philosophy' },
          { name: 'Resources', value: 'daily-resources' }
        ]
      },
      {
        name: 'role',
        description: 'The role to ping',
        type: ApplicationCommandOptionType.Role,
        required: true
      }
    ]
  },
  {
    name: 'testdaily',
    description: 'Force a daily transmission immediately (Admin Only)',
    options: [
      {
        name: 'feature',
        description: 'The category to test',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: 'Psychology', value: 'daily-psychology' },
          { name: 'Gaming', value: 'daily-gaming' },
          { name: 'Debate', value: 'daily-debate' },
          { name: 'Philosophy', value: 'daily-philosophy' },
          { name: 'Resources', value: 'daily-resources' }
        ]
      }
    ]
  },
  {
    name: 'say',
    description: 'Make the bot send a message in a channel',
    options: [
      { name: 'channel', description: 'Channel to send the message in', type: ApplicationCommandOptionType.Channel, required: true },
      { name: 'message', description: 'The message to send', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'setstreak',
    description: 'Manually set a users streak (Admin Only)',
    options: [
      { name: 'user', description: 'The user to modify', type: ApplicationCommandOptionType.User, required: true },
      { name: 'amount', description: 'The new streak amount', type: ApplicationCommandOptionType.Integer, required: true }
    ]
  },
  {
    name: 'setdescription',
    description: 'Set a persistent description message for this channel',
    options: [
      { name: 'text', description: 'The description message text', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'removedescription',
    description: 'Remove the persistent description message from this channel'
  },
  {
    name: 'setrules',
    description: 'Post the rules embed with an agree button in the rules channel',
    options: [
      { name: 'title', description: 'Title of the rules embed', type: ApplicationCommandOptionType.String, required: true },
      { name: 'rules', description: 'The rules text', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'addrulesrole',
    description: 'Add a role to be assigned when a user agrees to the rules',
    options: [
      { name: 'role', description: 'Role to assign on agree', type: ApplicationCommandOptionType.Role, required: true }
    ]
  },
  {
    name: 'removerulesrole',
    description: 'Remove a role from the rules agree list',
    options: [
      { name: 'role', description: 'Role to remove', type: ApplicationCommandOptionType.Role, required: true }
    ]
  },
  {
    name: 'listrulesroles',
    description: 'List all roles assigned when a user agrees to the rules'
  },
  {
    name: 'setrulesimage',
    description: 'Set an image to display in the rules embed',
    options: [
      { name: 'url', description: 'Image URL to display in the rules', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'setrulesgif',
    description: 'Set a GIF to send when a user agrees to the rules',
    options: [
      { name: 'url', description: 'GIF URL to send on agree', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'setlevelrole',
    description: 'Assign a role to be given at a specific level',
    options: [
      { name: 'level', description: 'The level to assign the role at', type: ApplicationCommandOptionType.Integer, required: true },
      { name: 'role', description: 'The role to assign', type: ApplicationCommandOptionType.Role, required: true }
    ]
  },
  {
    name: 'removelevelrole',
    description: 'Remove a role from a specific level',
    options: [
      { name: 'level', description: 'The level to remove the role from', type: ApplicationCommandOptionType.Integer, required: true }
    ]
  },
  {
    name: 'listlevelroles',
    description: 'List all level role assignments'
  },
  {
    name: 'swearcount',
    description: 'Check how many swears a user has',
    options: [
      { name: 'user', description: 'User to check', type: ApplicationCommandOptionType.User, required: false }
    ]
  },
  {
    name: 'streak',
    description: 'Check your current activity streak',
    options: [
      { name: 'user', description: 'User to check', type: ApplicationCommandOptionType.User, required: false }
    ]
  },
  {
    name: 'trigger',
    description: 'Set a custom auto-reply trigger',
    options: [
      { name: 'word', description: 'The word/phrase that triggers the bot', type: ApplicationCommandOptionType.String, required: true },
      { name: 'reply', description: 'The message the bot sends in response', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'removetrigger',
    description: 'Remove an existing auto-reply trigger',
    options: [
      { name: 'word', description: 'The trigger word to remove', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'listtriggers',
    description: 'View all active triggers for this server'
  },

  // Relationship commands
  {
    name: 'marry',
    description: 'Bind your soul to another.',
    options: [
      { name: 'user', description: 'The soul you wish to bind to', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'divorce',
    description: 'Sever the bond between you and your partner.'
  },
  {
    name: 'adopt',
    description: 'Take a soul under your protection.',
    options: [
      { name: 'user', description: 'The soul you wish to adopt', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'disown',
    description: 'Cast a child out of your bloodline.',
    options: [
      { name: 'user', description: 'The child to cast out', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'runaway',
    description: 'Flee from your parent and break the bond.'
  },
  {
    name: 'tree',
    description: 'View the bloodline of a soul.',
    options: [
      { name: 'user', description: 'The soul to inspect', type: ApplicationCommandOptionType.User, required: false }
    ]
  },
  {
    name: 'fight',
    description: 'Instigate a conflict with another soul.',
    options: [
      { name: 'user', description: 'The soul to challenge', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'forgive',
    description: 'Release the tension and offer peace.',
    options: [
      { name: 'user', description: 'The soul to forgive', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'checkbond',
    description: 'Analyze the connection with another soul.',
    options: [
      { name: 'user', description: 'The soul to check', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'hug',
    description: 'Pull someone close.',
    options: [
      { name: 'user', description: 'The person to hold', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'kiss',
    description: 'Leave a mark on their soul.',
    options: [
      { name: 'user', description: 'The person to kiss', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'slap',
    description: 'Strike them across the void.',
    options: [
      { name: 'user', description: 'The person to strike', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'pat',
    description: 'Offer quiet comfort.',
    options: [
      { name: 'user', description: 'The person to pat', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'protect',
    description: 'Shield them from darkness.',
    options: [
      { name: 'user', description: 'The person to shield', type: ApplicationCommandOptionType.User, required: true }
    ]
  },
  {
    name: 'help',
    description: 'View all bot commands and features'
  },

  // for the ai personality 
  {
    name: 'setpersonality',
    description: 'Change the underlying soul and behavior of the AI for this server',
    options: [
        { 
            name: 'prompt', 
            description: 'The instructions the AI should follow (e.g., "Act like a sarcastic pirate")', 
            type: ApplicationCommandOptionType.String, 
            required: true 
        }
    ]
  },
  
  // for the ai personality reset
  {
    name: 'resetpersonality',
    description: 'Restore the AI back to its original default personality'
  },

  // 🔥 AI LIMIT COMMANDS
  {
    name: 'toggleailimit',
    description: 'Enable or disable daily AI message limits',
    options: [
        { name: 'enabled', description: 'Enable limits?', type: ApplicationCommandOptionType.Boolean, required: true }
    ]
  },
  {
    name: 'setailimit',
    description: 'Set the daily AI message limit per user',
    options: [
        { name: 'count', description: 'Number of messages allowed', type: ApplicationCommandOptionType.Integer, required: true }
    ]
  }

];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`🔄 Attempting to register ${commands.length} commands...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Success! The Abyss has deployed its commands.');
  } catch (error) {
    console.error('❌ Deployment Failed:', error);
  }
})();