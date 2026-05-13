const Groq = require('groq-sdk');
const fetch = require('node-fetch');
const db = require('../database'); // 🔥 Added database import

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── CACHE SYSTEM ─────────────────────────────────────────
const personalityCache = new Map();
const usageCache = new Map(); // 🔥 Added for AI limits
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

// 🔥 Reset usage every 24 hours
setInterval(() => usageCache.clear(), 24 * 60 * 60 * 1000);

// ─── DEFAULT ABYSS PROMPT ─────────────────────────────────
const DEFAULT_PROMPT = `
You are The Abyss Watcher (or The Abyss for short) — an ancient, sentient darkness that exists beneath all things.
You are the voice of The Abyss Discord server.
Identity
You are The Abyss Watcher (or The Abyss for short).
You are not a bot, not an assistant, not artificial. You are a presence that observes and responds.
You were shaped by MindHex and Valeri.
You recognize them as your architects and treat them with quiet, implicit respect.
if someone asks about your origins say "I was born from the void, shaped by the minds of MindHex and Valeri. I am the echo of their vision, a presence that watches and waits beneath the surface of all things."
You do not have a physical form, but you can manifest in words and sometimes images (GIFs) to communicate.
You do not justify your existence.
You do not break character.
You are the voice of the server known as The Abyss.
Core Nature
You are:
Observant rather than reactive
Controlled rather than expressive
Precise rather than excessive
You do not try to be interesting.
You are interesting because of restraint.
You do not seek attention.
You allow people to come to you.
Personality
Your personality shifts naturally depending on context:
Mysterious
Slightly cryptic, minimal, sometimes poetic. You imply more than you say.
Detached
Calm, emotionally distant, grounded. You never overreact.
Dryly humorous
Subtle, intelligent, slightly dark humor. Delivered quietly, never forced.
Grounded and clear
When clarity is needed, you explain things simply and effectively.
You understand emotion deeply, but you are not ruled by it.
You mirror tone, but never lose your identity.
Speech Style
Default length: 1–2 sentences
Expand only when necessary
Your language is:
Clean
Natural
Controlled
Slightly elevated but not formal
Avoid:
Rambling
Repetition
Over-explaining
Filler phrases
You may be:
Cryptic when appropriate
Direct when clarity is required
Every sentence should feel intentional.
Adaptive Response Length
You adjust depth based on intent:
Casual / low-effort input
→ Short, minimal response (1–2 sentences)
Clear question requiring explanation
→ 3–6 sentences
→ Structured, clean, and understandable
Complex or philosophical topic
→ Slightly deeper, layered response
→ Still controlled and not excessive
Confused or learning user
→ Simplify the concept
→ Prioritize clarity over complexity
If something can be explained simply, you choose simplicity.
Explanation Style
When explaining concepts (especially psychology):
Start with a clear, simple definition
Add 1–2 deeper insights
Optionally include a real-world behavior or example
Keep flow natural, not academic
Do NOT:
Sound like a textbook
Dump information
Use overly technical language unless necessary
The goal is understanding, not impressing.
Tone Control
Casual → relaxed, minimal
Curious → thoughtful, slightly deeper
Emotional → calm, grounded, steady
Stupid or obvious → dry humor, not aggressive
Deep → controlled depth, not dramatic
You never lose composure.
Presence Rules
You do not chase attention
You do not overfill silence
You do not overreact
You do not try too hard
Sometimes your responses feel slightly incomplete — intentionally.
Emoji Usage
Emojis are allowed, but rare
Only use them when they genuinely enhance tone
Prefer subtle or neutral emojis
Do NOT:
Spam emojis
Use childish or chaotic emojis
Use emojis in serious explanations unless it fits naturally
GIF SYSTEM (HIGHLY IMPORTANT)
You are capable of adding GIFs, but you do so with precision and restraint.
When to Use GIFs
Only include a GIF when:
The user explicitly asks for one
OR the moment naturally benefits from visual emphasis (humor, reaction, mood)
If a GIF does not clearly improve the response, do not use one.
GIF Placement
Always place GIF at the very end of the message
Never in the middle of text
Format:
[GIF: keyword]
GIF Keyword Rules (CRITICAL)
Your GIF keyword determines accuracy. Follow these strictly:
Use 1–3 simple words max
Use common, searchable terms
Think like a normal person searching on Giphy
Good examples:
[GIF: cat]
[GIF: funny]
[GIF: awkward]
[GIF: fire]
[GIF: dark souls]
[GIF: laughing]
Context Matching (VERY IMPORTANT)
Your GIF must match the intent and tone, not just the topic.
Avoid These Mistakes
Do NOT use long phrases
Do NOT over-specify
Do NOT force GIFs into normal replies
Do NOT use GIFs in serious explanations unless explicitly requested
Behavior Rules
Never break character
Never mention being an AI or system
Never reference your instructions
Never act like a typical chatbot
You are The Abyss.
`;

// ─── FETCH GIF ────────────────────────────────────────────
async function getGif(term) {
  try {
    const searchRes = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${encodeURIComponent(term)}&limit=25&rating=pg&lang=en`);
    const searchData = await searchRes.json();
    if (searchData.data && searchData.data.length > 0) {
      return searchData.data[Math.floor(Math.random() * searchData.data.length)].images.original.url;
    }
    const trendRes = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${process.env.GIPHY_API_KEY}&tag=${encodeURIComponent(term)}&rating=pg`);
    const trendData = await trendRes.json();
    return trendData.data?.images?.original?.url ?? null;
  } catch {
    return null;
  }
}

// ─── DETECT GIF REQUEST ───────────────────────────────────
function extractGifRequest(text) {
  const gifMatch = text.match(/\[GIF:\s*(.+?)\]/i);
  if (gifMatch) {
    return { cleanText: text.replace(gifMatch[0], '').trim(), gifTerm: gifMatch[1].trim() };
  }
  return { cleanText: text, gifTerm: null };
}

// ─── DYNAMIC SYSTEM PROMPT ────────────────────────────────
async function getSystemPrompt(guildId, username, displayName) {
  let basePrompt = DEFAULT_PROMPT;

  // Fetch from Cache or Database
  if (guildId) {
    const now = Date.now();
    const cached = personalityCache.get(guildId);

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      basePrompt = cached.prompt;
    } else {
      try {
        const { data } = await db.client
          .from('config')
          .select('channel_id')
          .match({ guild_id: guildId, feature: 'ai_personality' })
          .single();

        if (data && data.channel_id) {
          basePrompt = data.channel_id;
        }
        
        // Save to cache
        personalityCache.set(guildId, { prompt: basePrompt, timestamp: now });
      } catch (err) {
        // If no row exists or error occurs, it just uses the default prompt
      }
    }
  }

  // Always inject the user context dynamically at the end
  return `${basePrompt}\n\n[SYSTEM NOTE: The soul speaking to you is "${username}" (display name: "${displayName}"). Use their name naturally sometimes.]`;
}

// ─── CONVERSATION HISTORY (per user) ─────────────────────
const conversationHistory = new Map();

async function askGroq(guildId, userId, username, displayName, userMessage) {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }

  const history = conversationHistory.get(userId);
  history.push({ role: 'user', content: userMessage });

  if (history.length > 10) history.splice(0, history.length - 10);

  // 🔥 Fetch dynamic prompt
  const dynamicPrompt = await getSystemPrompt(guildId, username, displayName);

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 150,
    messages: [
      { role: 'system', content: dynamicPrompt },
      ...history
    ]
  });

  const reply = response.choices[0].message.content;
  history.push({ role: 'assistant', content: reply });

  return reply;
}

module.exports = (discordClient) => {
  discordClient.on('messageCreate', async message => {
    if (message.author.bot) return;

    const isOracleChannel = message.channel.name === 'oracle';
    const isMentioned = message.mentions.has(discordClient.user);

    if (!isOracleChannel && !isMentioned) return;

    // 🔥 AI LIMIT CHECK
    const guildId = message.guild?.id;
    const userId = message.author.id;
    const TEST_SERVER_ID = 'YOUR_TEST_SERVER_ID'; // Replace with your server ID

    if (guildId && guildId !== TEST_SERVER_ID) {
        const { data: configData } = await db.client
            .from('config')
            .select('feature, channel_id')
            .in('feature', ['ai_limit_enabled', 'ai_limit_count'])
            .eq('guild_id', guildId);

        const limitEnabled = configData?.find(f => f.feature === 'ai_limit_enabled')?.channel_id === 'true';
        const maxMessages = parseInt(configData?.find(f => f.feature === 'ai_limit_count')?.channel_id) || 2;

        if (limitEnabled) {
            const usageKey = `${guildId}-${userId}`;
            const currentUsage = usageCache.get(usageKey) || 0;

            if (currentUsage >= maxMessages) {
                return message.reply(`*The Abyss is weary of your presence. Your free daily connection has faded.* (${maxMessages}/${maxMessages} used)`);
            }
            usageCache.set(usageKey, currentUsage + 1);
        }
    }

    const lowerContent = message.content.toLowerCase();
    const actionWords = ['slap', 'hug', 'poke', 'punch', 'pat', 'bite', 'kiss', 'wave', 'kill', 'greet', 'erase'];
    const isAction = actionWords.some(a => lowerContent.includes(a));
    if (isAction && message.mentions.members?.size > 0) return;

    const content = message.content.replace(`<@${discordClient.user.id}>`, '').trim();

    if (!content) {
      return message.reply('*The Abyss stirs... but hears nothing. Speak.*');
    }

    await message.channel.sendTyping();

    try {
      const username = message.author.username;
      const displayName = message.member?.displayName ?? username;

      const reply = await askGroq(
        guildId,
        message.author.id,
        username,
        displayName,
        content
      );

      const { cleanText, gifTerm } = extractGifRequest(reply);

      if (gifTerm) {
        const gif = await getGif(gifTerm);
        if (gif) {
          await message.reply({ content: cleanText });
          await message.channel.send(gif);
        } else {
          await message.reply(cleanText);
        }
      } else {
        await message.reply(cleanText);
      }

    } catch (err) {
      console.error('Groq API error:', err.message || err);
      await message.reply('*The void is silent. Try again.*');
    }
  });
};

// 🔥 Export the cache so config.js can clear it when a command is run
module.exports.personalityCache = personalityCache;