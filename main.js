const express = require('express');
const axios = require('axios');
const Instaloader = require('instaloader');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN || '7586442643:AAG6yURFl9EX04Au44g7NAn0TZcJA4Tla_I';
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Configure axios with retries
const http = axios.create({
  timeout: 30000,
  maxRedirects: 0,
  retry: {
    retries: 3,
    retryDelay: (retryCount) => {
      return retryCount * 1000;
    },
    retryCondition: (error) => {
      return [500, 502, 503, 504].includes(error.response?.status);
    }
  }
});

// Configure Instaloader
const L = new Instaloader({
  requestTimeout: 30000,
  maxConnectionAttempts: 3,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
});

async function getInstagramInfo(username) {
  try {
    let profile;
    try {
      profile = await Instaloader.Profile.from_username(L.context, username);
    } catch (error) {
      return `❌ Instagram connection failed. Please try again later.\n(Error: ${error.message})`;
    }

    let creationDate = "Not Available";
    try {
      if (profile.created_date) {
        creationDate = profile.created_date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch (error) {
      // Ignore errors
    }

    let businessInfo = "Not Business Account";
    try {
      if (profile.is_business_account) {
        businessInfo = profile.business_category_name || "Business Account";
      }
    } catch (error) {
      // Ignore errors
    }

    const response = [
      "📊 <b>Instagram Profile Analysis</b>\n",
      `👤 <b>Name</b>: ${profile.full_name || 'Not Available'}`,
      `🔗 <b>Username</b>: @${profile.username}`,
      `🆔 <b>Account ID</b>: ${profile.userid}`,
      `📅 <b>Account Created</b>: ${creationDate}`,
      `📝 <b>Biography</b>: ${profile.biography || 'Not Available'}`,
      `🏢 <b>Business Category</b>: ${businessInfo}`,
      `🌐 <b>External URL</b>: ${profile.external_url || 'Not Available'}`,
      `👥 <b>Followers</b>: ${profile.followers.toLocaleString()}`,
      `👤 <b>Following</b>: ${profile.followees.toLocaleString()}`,
      `📮 <b>Total Posts</b>: ${profile.mediacount.toLocaleString()}`,
      `🔒 <b>Private Account</b>: ${profile.is_private ? 'Yes' : 'No'}`,
      `✅ <b>Verified Account</b>: ${profile.is_verified ? 'Yes' : 'No'}`,
      `🏢 <b>Business Account</b>: ${profile.is_business_account ? 'Yes' : 'No'}`
    ];

    if (profile.profile_pic_url) {
      response.push(`📸 <b>Profile Picture</b>: <a href='${profile.profile_pic_url}'>View HD Photo</a>`);
      response.push(`📲 <b>Profile Link</b>: <a href='https://www.instagram.com/${profile.username}/'>Open in Instagram</a>`);
    }

    return response.join("\n");
  } catch (error) {
    return `❌ Error retrieving profile: ${error.message}`;
  }
}

async function sendMessage(chatId, text) {
  const url = `${BASE_URL}/sendMessage`;
  const data = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: false
  };
  try {
    await http.post(url, data);
  } catch (error) {
    console.error('Error sending message:', error.message);
  }
}

// Webhook endpoint for Telegram
app.post('/webhook', async (req, res) => {
  const update = req.body;
  
  if (update.message && update.message.text) {
    const text = update.message.text;
    const chatId = update.message.chat.id;
    
    if (text.startsWith('/start')) {
      await sendMessage(chatId, 
        "<b>Instagram info bot!</b>\n\n" +
        "Send /info username to analyze any public Instagram profile\n\n" +
        "Example: <code>/info cristiano</code>\n\n" +
        "⚠️ <i>Note: Some data may be unavailable due to Instagram restrictions</i>");
    } else if (text.startsWith('/info')) {
      if (text.split(' ').length < 2) {
        await sendMessage(chatId, "⚠️ Usage: <code>/info username</code>");
      } else {
        const username = text.split(' ')[1].replace('@', '').trim();
        await sendMessage(chatId, `🔍 Searching for @${username}...`);
        const info = await getInstagramInfo(username);
        await sendMessage(chatId, info);
      }
    }
  }
  
  res.status(200).send('OK');
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Instagram Info Bot is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Bot is running on port ${PORT}`);
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
