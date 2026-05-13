const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

async function getActionGif(term) {
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${encodeURIComponent(term)}&limit=10&rating=pg`
    );
    const data = await res.json();
    if (!data.data || data.data.length === 0) return null;
    const random = data.data[Math.floor(Math.random() * data.data.length)];
    return random.images.original.url;
  } catch {
    return null;
  }
}

const actions = {
  slap:  {
    gifs: ['dark souls pvp slap', 'elden ring slap', 'soulsborne hit'],
    color: '#8b0000',
    message: (a, b) => `**${a}** slaps **${b}** across the face.`
  },
  hug:   {
    gifs: ['dark souls gesture', 'elden ring gesture bow', 'soulsborne gesture'],
    color: '#2c2c3e',
    message: (a, b) => `**${a}** pulls **${b}** into the darkness for a hug.`
  },
  poke:  {
    gifs: ['dark souls finger', 'elden ring poke attack', 'soulsborne poke'],
    color: '#1a1a2e',
    message: (a, b) => `**${a}** pokes **${b}** from the shadows.`
  },
  punch: {
    gifs: ['dark souls punch', 'elden ring fist', 'soulsborne combat punch'],
    color: '#8b0000',
    message: (a, b) => `**${a}** lands a heavy blow on **${b}**.`
  },
  pat:   {
    gifs: ['dark souls gesture pat', 'elden ring gesture', 'soulsborne gesture wave'],
    color: '#2c2c3e',
    message: (a, b) => `**${a}** places a hand on **${b}**'s head.`
  },
  bite:  {
    gifs: ['elden ring beast bite', 'dark souls dragon bite', 'soulsborne beast attack'],
    color: '#8b0000',
    message: (a, b) => `**${a}** sinks their teeth into **${b}**.`
  },
  kiss:  {
    gifs: ['dark souls gesture bow', 'elden ring reverence gesture', 'soulsborne worship'],
    color: '#4a0000',
    message: (a, b) => `**${a}** leans in and kisses **${b}**.`
  },
  wave:  {
    gifs: ['dark souls wave gesture', 'elden ring wave', 'soulsborne wave gesture'],
    color: '#1a1a2e',
    message: (a, b) => `**${a}** waves at **${b}** from across the void.`
  },
  kill:  {
    gifs: ['dark souls death', 'elden ring death', 'soulsborne you died'],
    color: '#8b0000',
    message: (a, b) => `**${a}** sends **${b}** to the void. Permanently.`
  },
  greet: {
    gifs: ['dark souls bow gesture', 'elden ring bow gesture', 'soulsborne greeting gesture'],
    color: '#2c2c3e',
    message: (a, b) => `**${a}** greets **${b}** with a solemn bow.`
  },
  erase: {
    gifs: ['rocket launch space', 'launched into space', 'flying into space'],
    color: '#1a1a2e',
    message: (a, b) => `**${a}** erases **${b}** from existence. They are now in space.`
  },
};

// Trigger keywords — case insensitive
const BOT_TRIGGERS = ['abyss watcher', 'abyss', 'watcher'];

function parseMessage(content, botId) {
  let cleaned = content.replace(`<@${botId}>`, '').trim();

  // Case insensitive trigger removal
  for (const trigger of BOT_TRIGGERS) {
    const regex = new RegExp(`^${trigger}`, 'i');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '').trim();
      break;
    }
  }

  return cleaned.toLowerCase();
}

module.exports = (client) => {
  client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const content = message.content;
    const botId = client.user.id;
    const isMentioned = message.mentions.has(botId);
    const lowerContent = content.toLowerCase();

    // Case insensitive trigger check
    const hasTrigger = isMentioned ||
      BOT_TRIGGERS.some(t => lowerContent.includes(t.toLowerCase()));
    if (!hasTrigger) return;

    const parsed = parseMessage(content, botId);

    // Find matching action
    const actionName = Object.keys(actions).find(a => parsed.startsWith(a));
    if (!actionName) return;

    const action = actions[actionName];

    // Get target — first mention that isn't the bot
    const target = message.mentions.members.filter(m => m.id !== botId).first();

    if (!target)
      return message.reply(`*The void sees no target. Mention someone, wanderer.*`);

    if (target.id === message.author.id)
      return message.reply(`*The abyss stares back. You cannot do that to yourself.*`);

    // Pick a random gif search term from the action's list
    const gifTerm = action.gifs[Math.floor(Math.random() * action.gifs.length)];
    const gif = await getActionGif(gifTerm);

    const invoker = message.author.username;

    const embed = new EmbedBuilder()
      .setColor(action.color)
      .setDescription(action.message(invoker, target.user.username))
      .setFooter({ text: 'The Abyss — Even darkness has its rituals.' })
      .setTimestamp();

    if (gif) embed.setImage(gif);

    await message.reply({ embeds: [embed] });
  });
};