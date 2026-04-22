const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = {
    client: supabase,
    // This helper now acts as a "Safety Net" for files we haven't migrated yet
    query: async (text, params = []) => {
        try {
            // This is a temporary bridge. It logs which file is still using old code.
            console.log(`⚠️ Legacy SQL call detected: ${text.substring(0, 50)}...`);
            
            // We return a 'safe' empty object so the bot doesn't crash on .rows[0]
            return { rows: [{}], rowCount: 0 }; 
        } catch (err) {
            console.error("❌ Legacy Query Helper Error:", err);
            return { rows: [], rowCount: 0 };
        }
    }
};