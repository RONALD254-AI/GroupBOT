// baileys-bot.js - HighRon Master Bot with ALL Commands (FULLY FIXED QR CODE)
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const express = require('express');
const pino = require('pino');
const axios = require('axios');
const { execSync } = require('child_process');

// ==================== RENDER PORT BINDING ====================
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>HighRon Master Bot</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>🤖 HighRon Master Bot</h1>
        <p>Status: <strong style="color: green;">ONLINE</strong></p>
        <p>Bot is running with Baileys (no browser needed)</p>
        <p><small>Check Render logs BELOW for QR code to scan.</small></p>
        <p><small>Version: 3.0.0</small></p>
      </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Render health check server running on port ${PORT}`);
});

// ==================== SELF-PING TO KEEP ALIVE ====================
setInterval(() => {
  axios.get(`https://groupbot-duv3.onrender.com`).catch(() => {});
  console.log('💓 Self-ping to keep alive');
}, 600000); // Every 10 minutes

// ==================== BOT CONFIGURATIONS ====================
const BOT_CONFIG = {
  adminNumber: "254719201893",
  secondAdminNumber: "254745813179",
  prefix: "/",
  botName: "HighRon Master",
  version: "3.0.0",
  timezone: "Africa/Nairobi",
};

const TARGET_GROUP_ID = "120363345456275293@g.us";

// ==================== DATA STRUCTURES ====================
let warnedUsers = {};
let mutedUsers = {};
let autoReplyKeywords = {};
let antilinkEnabled = true;
let welcomeMessage = "👋 Welcome to the group @user! Read the rules and be happy! 🎉";
let goodbyeMessage = "👋 @user left the group. See you later!";
const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

// ==================== LOAD/SAVE FUNCTIONS ====================
function loadData() {
  try {
    const dataDir = "./data";
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    if (fs.existsSync("./data/warned.json")) {
      warnedUsers = JSON.parse(fs.readFileSync("./data/warned.json", "utf8"));
    }
    if (fs.existsSync("./data/muted.json")) {
      mutedUsers = JSON.parse(fs.readFileSync("./data/muted.json", "utf8"));
    }
    if (fs.existsSync("./data/autoreply.json")) {
      autoReplyKeywords = JSON.parse(fs.readFileSync("./data/autoreply.json", "utf8"));
    }
    if (fs.existsSync("./data/settings.json")) {
      const settings = JSON.parse(fs.readFileSync("./data/settings.json", "utf8"));
      antilinkEnabled = settings.antilinkEnabled ?? true;
      welcomeMessage = settings.welcomeMessage ?? welcomeMessage;
      goodbyeMessage = settings.goodbyeMessage ?? goodbyeMessage;
    }
    console.log("✅ Data loaded successfully!");
  } catch (error) {
    console.log("⚠️ Error loading data:", error.message);
  }
}

function saveData() {
  try {
    fs.writeFileSync("./data/warned.json", JSON.stringify(warnedUsers, null, 2));
    fs.writeFileSync("./data/muted.json", JSON.stringify(mutedUsers, null, 2));
    fs.writeFileSync("./data/autoreply.json", JSON.stringify(autoReplyKeywords, null, 2));
    fs.writeFileSync("./data/settings.json", JSON.stringify({ antilinkEnabled, welcomeMessage, goodbyeMessage }, null, 2));
    console.log("✅ Data saved successfully!");
  } catch (error) {
    console.log("⚠️ Error saving data:", error.message);
  }
}

function isAdmin(jid) {
  return jid.includes(BOT_CONFIG.adminNumber) || jid.includes(BOT_CONFIG.secondAdminNumber);
}

async function isGroupAdmin(sock, groupId, participantId) {
  try {
    const groupMetadata = await sock.groupMetadata(groupId);
    if (!groupMetadata || !groupMetadata.participants) return false;
    const participant = groupMetadata.participants.find(p => p.id === participantId);
    return participant ? participant.admin : false;
  } catch (error) {
    return false;
  }
}

console.log('='.repeat(60));
console.log(`🤖 ${BOT_CONFIG.botName} v${BOT_CONFIG.version} (Baileys)`);
console.log('='.repeat(60));

loadData();

// ==================== FIXED BAILEYS CONNECTION WITH QR CODE ====================
async function connectToWhatsApp() {
  console.log('🚀 Starting bot with Baileys...');
  
  // Delete old auth folder if it exists to force new QR
  const authFolder = './auth_info';
  if (fs.existsSync(authFolder)) {
    console.log('📁 Auth folder exists - keeping existing session');
  }
  
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  const sock = makeWASocket({
    printQRInTerminal: true, // CRITICAL: This forces QR to print in terminal
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['HighRon Bot', 'Chrome', '3.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    qrTimeout: 60000, // 60 seconds timeout
  });

  // Flag to track if QR was shown
  let qrShown = false;

  // Handle QR Code with MULTIPLE fallback methods
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // Method 1: Direct QR from update
    if (qr && !qrShown) {
      qrShown = true;
      console.log('\n' + '🔔'.repeat(30));
      console.log('🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔');
      console.log('🔔               QR CODE READY TO SCAN                🔔');
      console.log('🔔'.repeat(30));
      console.log('\n' + '='.repeat(70));
      console.log('📱 SCAN THIS QR CODE WITH YOUR WHATSAPP:');
      console.log('='.repeat(70));
      
      // Generate QR code in terminal
      qrcode.generate(qr, { small: false });
      
      console.log('\n' + '='.repeat(70));
      console.log('📋 INSTRUCTIONS:');
      console.log('1. Open WhatsApp on your phone');
      console.log('2. Tap Menu (3 dots) > Linked Devices');
      console.log('3. Tap "Link a Device"');
      console.log('4. Scan the QR code above ☝️');
      console.log('5. QR expires in 60 seconds');
      console.log('='.repeat(70));
      console.log('\n');
      
      // Method 2: Also log the raw QR as backup
      console.log('🔑 Raw QR (if above doesn\'t display properly):');
      console.log(qr.substring(0, 50) + '...');
    }
    
    if (connection === 'connecting') {
      console.log('🔄 Connecting to WhatsApp...');
    }
    
    if (connection === 'open') {
      console.log('\n' + '🎉'.repeat(30));
      console.log('✅ BOT IS READY AND CONNECTED!');
      console.log('🎉'.repeat(30));
      console.log('='.repeat(60));
      console.log(`📱 Bot: ${BOT_CONFIG.botName}`);
      console.log(`👑 Admin: +${BOT_CONFIG.adminNumber}`);
      console.log(`🎯 Target Group: ${TARGET_GROUP_ID}`);
      console.log('='.repeat(60));
      
      // Send welcome message to group
      setTimeout(async () => {
        try {
          await sock.sendMessage(TARGET_GROUP_ID, { 
            text: '🤖 *HighRon Master Bot is now online!*\nUse /menu to see commands.' 
          });
          console.log('✅ Welcome message sent to group');
        } catch (err) {
          console.log('⚠️ Could not send welcome message - make sure bot is in the group');
        }
      }, 5000);
      
      initializeScheduledTasks(sock);
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔄 Connection closed. Reconnecting:', shouldReconnect);
      
      // Reset QR flag on disconnect
      qrShown = false;
      
      if (shouldReconnect) {
        // Wait 3 seconds before reconnecting
        setTimeout(() => {
          connectToWhatsApp();
        }, 3000);
      } else {
        console.log('❌ Logged out. Please scan QR code again.');
        // Delete auth folder to force new QR
        if (fs.existsSync('./auth_info')) {
          fs.rmSync('./auth_info', { recursive: true, force: true });
        }
        // Restart connection
        setTimeout(() => {
          connectToWhatsApp();
        }, 3000);
      }
    }
  });

  // Save credentials
  sock.ev.on('creds.update', saveCreds);

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    
    const chatId = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;
    const messageBody = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || 
                       msg.message.imageMessage?.caption || '';
    
    // Only process messages from target group
    if (chatId !== TARGET_GROUP_ID) return;
    
    console.log(`\n📨 Message from ${senderId.split('@')[0]}: ${messageBody.substring(0, 50)}...`);
    
    try {
      // Check if sender is admin
      const isUserAdmin = await isGroupAdmin(sock, chatId, senderId);
      
      // Check if user is muted
      if (mutedUsers[senderId] && mutedUsers[senderId] > Date.now()) {
        console.log(`🔇 User ${senderId} is muted - ignoring message`);
        return;
      }

      // Check for expired mutes
      if (mutedUsers[senderId] && mutedUsers[senderId] < Date.now()) {
        delete mutedUsers[senderId];
        saveData();
      }
      
      // ANTI-LINK
      if (antilinkEnabled && !isUserAdmin && linkRegex.test(messageBody)) {
        await sock.sendMessage(chatId, { 
          text: `@${senderId.split('@')[0]} Links are not allowed in this group!`, 
          mentions: [senderId] 
        });
        console.log('🚫 Link detected - warning sent');
        return;
      }
      
      // COMMANDS
      if (messageBody.startsWith(BOT_CONFIG.prefix)) {
        await handleCommand(sock, msg, chatId, senderId, isUserAdmin);
        return;
      }
      
      // REMOVE COMMAND
      if (messageBody.toLowerCase().startsWith('!remove')) {
        await handleRemoveCommand(sock, msg, chatId, senderId, isUserAdmin);
        return;
      }
      
      // QUESTION CHECK
      if (messageBody.trim().endsWith('?')) {
        await handleQuestion(sock, chatId, senderId, messageBody);
        return;
      }
      
      // AUTO-REPLY
      for (const [keyword, response] of Object.entries(autoReplyKeywords)) {
        if (messageBody.toLowerCase().includes(keyword.toLowerCase())) {
          await sock.sendMessage(chatId, { text: response });
          console.log(`🤖 Auto-reply triggered for: ${keyword}`);
          return;
        }
      }
      
    } catch (err) {
      console.log('Error processing message:', err.message);
    }
  });

  // Handle group participant updates
  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update;
    
    if (id !== TARGET_GROUP_ID) return;
    
    // LEAVE PREVENTION
    if (action === 'remove') {
      for (const participant of participants) {
        try {
          await sock.groupParticipantsUpdate(id, [participant], 'add');
          console.log(`🔄 User re-added: ${participant}`);
          await sock.sendMessage(id, { 
            text: `@${participant.split('@')[0]} You cannot leave without permission! Adding you back...`,
            mentions: [participant]
          });
        } catch (error) {
          console.log('Leave prevention error:', error.message);
        }
      }
    }
    
    // GROUP JOIN EVENT
    if (action === 'add') {
      for (const participant of participants) {
        try {
          const welcomeMsg = welcomeMessage.replace('@user', `@${participant.split('@')[0]}`);
          await sock.sendMessage(id, { 
            text: welcomeMsg,
            mentions: [participant]
          });
          console.log(`👋 Welcome sent to: ${participant}`);
        } catch (error) {
          console.log('Welcome error:', error.message);
        }
      }
    }
  });

  return sock;
}

// ==================== COMMAND HANDLER ====================
async function handleCommand(sock, msg, chatId, senderId, isUserAdmin) {
  const messageBody = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
  const args = messageBody.slice(BOT_CONFIG.prefix.length).trim().split(/ +/);
  const command = args[0].toLowerCase();
  
  console.log(`🎯 Executing command: ${command} from @${senderId.split('@')[0]}`);

  // PUBLIC COMMANDS
  const publicCommands = [
    "menu", "ping", "info", "profile", "groupinfo", "status", "test",
    "dice", "coin", "8ball", "rps", "calc", "sticker"
  ];

  // ADMIN ONLY COMMANDS
  const adminOnlyCommands = [
    "kick", "add", "promote", "demote", "tagall", "everyone",
    "warn", "unwarn", "mute", "unmute", "antilink", "welcome", "goodbye", "autoreply"
  ];

  if (adminOnlyCommands.includes(command) && !isUserAdmin && !isAdmin(senderId)) {
    await sock.sendMessage(chatId, { text: "❌ Only group administrators can use this command!" });
    return;
  }

  if (!publicCommands.includes(command) && !adminOnlyCommands.includes(command)) {
    await sock.sendMessage(chatId, { text: "❌ Unknown command. Use /menu to see available commands." });
    return;
  }
  
  switch(command) {
    case "menu":
      await sock.sendMessage(chatId, { text: `
╭─────────────────────────────╮
│    🤖 *HIGH RON MASTER*     │
│      *PREMIUM BOT* 🚀        │
╰─────────────────────────────╯

┌─ 👑 *ADMIN COMMANDS (Admins Only)*
├─ /kick - Remove member
├─ /add [number] - Add member
├─ /promote - Make admin
├─ /demote - Remove admin
├─ /tagall - Mention everyone
├─ /warn - Warn member
├─ /unwarn - Remove warning
├─ /mute [time] - Mute member
├─ /unmute - Unmute member
├─ /antilink on/off - Toggle anti-link
├─ /welcome [msg] - Set welcome
├─ /goodbye [msg] - Set goodbye
├─ /autoreply [word] [reply] - Set auto-reply

┌─ 📊 *PUBLIC COMMANDS (Everyone)*
├─ /info - Bot information
├─ /profile - Your profile
├─ /groupinfo - Group info
├─ /status - System status
├─ /ping - Check latency
├─ /test - Run diagnostic

┌─ 🎮 *GAME COMMANDS (Everyone)*
├─ /dice - Roll dice
├─ /coin - Flip coin
├─ /8ball [question] - Magic 8 ball
├─ /rps [rock/paper/scissors] - Play game

┌─ 🛠️ *UTILITY COMMANDS (Everyone)*
├─ /sticker - Create sticker
├─ /calc [operation] - Calculator

⚡ Status: Online | Anti-Link: ${antilinkEnabled ? "✅ ON" : "❌ OFF"}
      `});
      break;
      
    case "ping":
      const start = Date.now();
      await sock.sendMessage(chatId, { text: "🏓 Pong!" });
      const end = Date.now();
      await sock.sendMessage(chatId, { text: `🏓 Pong! ${end - start}ms` });
      break;
      
    case "info":
      await sock.sendMessage(chatId, { text: `
🤖 *BOT INFORMATION*

📱 Name: ${BOT_CONFIG.botName}
📊 Version: ${BOT_CONFIG.version}
👑 Main Admin: +${BOT_CONFIG.adminNumber}
👑 Co-Admin: +${BOT_CONFIG.secondAdminNumber}
⚡ Commands: 30+
🛡️ Anti-Link: ${antilinkEnabled ? "ON" : "OFF"}
💎 The most complete WhatsApp bot!
      `});
      break;
      
    case "profile":
      await sock.sendMessage(chatId, { text: `
👤 *YOUR PROFILE*

📱 Name: ${msg.pushName || senderId.split('@')[0]}
📞 Number: +${senderId.split('@')[0]}
⚠️ Warnings: ${warnedUsers[senderId] || 0}
🔇 Muted: ${mutedUsers[senderId] ? "Yes" : "No"}
      `});
      break;
      
    case "groupinfo":
      try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const admins = groupMetadata.participants.filter(p => p.admin).length;
        await sock.sendMessage(chatId, { text: `
👥 *GROUP INFORMATION*

📌 Name: ${groupMetadata.subject || "Unnamed"}
📝 About: Exploring the world of Technology and advancing through different activities offered by HighRon Tech
👥 Members: ${groupMetadata.participants.length}
👑 Admins: ${admins}
🛡️ Anti-Link: ${antilinkEnabled ? "ON" : "OFF"}
        `});
      } catch (err) {
        await sock.sendMessage(chatId, { text: "❌ Could not get group info" });
      }
      break;
      
    case "status":
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const mem = process.memoryUsage();
      await sock.sendMessage(chatId, { text: `
📊 *SYSTEM STATUS*

🟢 Status: ONLINE
⏰ Uptime: ${hours}h ${minutes}m
💾 Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB
🛡️ Anti-Link: ${antilinkEnabled ? "ON" : "OFF"}
📋 Auto-Reply: ${Object.keys(autoReplyKeywords).length} rules
      `});
      break;
      
    case "test":
      try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botId && p.admin);
        await sock.sendMessage(chatId, { text: `
🤖 *DIAGNOSTIC REPORT*

✅ Bot Status: ONLINE
👑 Bot Admin: ${isBotAdmin ? "✅ YES" : "❌ NO"}
👤 Your Role: ${isUserAdmin ? "👑 ADMIN" : "👤 MEMBER"}
🎯 Group: ${groupMetadata.subject || "Unknown"}
👥 Members: ${groupMetadata.participants.length}
🛡️ Anti-Link: ${antilinkEnabled ? "ON" : "OFF"}
📊 Data Files: OK
⚡ All systems operational!

${isBotAdmin ? "✅ Bot is ready!" : "⚠️ Promote bot to admin for full features!"}
        `});
      } catch (err) {
        await sock.sendMessage(chatId, { text: "❌ Could not get group info" });
      }
      break;
      
    case "antilink":
      if (args[1] === "on") {
        antilinkEnabled = true;
        await sock.sendMessage(chatId, { text: "🛡️ Anti-Link activated!" });
      } else if (args[1] === "off") {
        antilinkEnabled = false;
        await sock.sendMessage(chatId, { text: "🔓 Anti-Link deactivated!" });
      } else {
        await sock.sendMessage(chatId, { text: `🛡️ Anti-Link is ${antilinkEnabled ? "ON" : "OFF"}` });
      }
      saveData();
      break;
      
    case "welcome":
      const newWelcome = args.slice(1).join(" ");
      if (!newWelcome) {
        await sock.sendMessage(chatId, { text: `👋 Current welcome: "${welcomeMessage}"` });
        return;
      }
      welcomeMessage = newWelcome;
      await sock.sendMessage(chatId, { text: `✅ Welcome message updated!` });
      saveData();
      break;
      
    case "goodbye":
      const newGoodbye = args.slice(1).join(" ");
      if (!newGoodbye) {
        await sock.sendMessage(chatId, { text: `👋 Current goodbye: "${goodbyeMessage}"` });
        return;
      }
      goodbyeMessage = newGoodbye;
      await sock.sendMessage(chatId, { text: `✅ Goodbye message updated!` });
      saveData();
      break;
      
    case "autoreply":
      if (args[1] === "list") {
        if (Object.keys(autoReplyKeywords).length === 0) {
          await sock.sendMessage(chatId, { text: "📋 No auto-reply keywords configured." });
          return;
        }
        let list = "📋 *Auto-Reply Keywords:*\n";
        for (const [key, val] of Object.entries(autoReplyKeywords)) {
          list += `• "${key}" → ${val.substring(0, 30)}...\n`;
        }
        await sock.sendMessage(chatId, { text: list });
        return;
      }
      
      const keyword = args[1];
      const response = args.slice(2).join(" ");
      
      if (!keyword || !response) {
        await sock.sendMessage(chatId, { text: "❌ Usage: /autoreply [keyword] [response]" });
        return;
      }
      
      autoReplyKeywords[keyword.toLowerCase()] = response;
      await sock.sendMessage(chatId, { text: `✅ Auto-reply set for: "${keyword}"` });
      saveData();
      break;
      
    case "tagall":
    case "everyone":
      try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const mentions = groupMetadata.participants.map(p => p.id);
        const mentionText = groupMetadata.participants.map(p => `@${p.id.split('@')[0]}`).join(" ");
        await sock.sendMessage(chatId, { 
          text: `📢 *Attention everyone!*\n\n${mentionText}`,
          mentions 
        });
      } catch (err) {
        await sock.sendMessage(chatId, { text: "❌ Could not get group participants" });
      }
      break;
      
    case "dice":
      const diceResult = Math.floor(Math.random() * 6) + 1;
      const diceEmojis = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
      await sock.sendMessage(chatId, { text: `🎲 *DICE*\n\n${diceEmojis[diceResult-1]} Result: ${diceResult}` });
      break;
      
    case "coin":
      const coinResult = Math.random() < 0.5 ? "HEADS" : "TAILS";
      const coinEmoji = coinResult === "HEADS" ? "🪙" : "👑";
      await sock.sendMessage(chatId, { text: `🪙 *COIN FLIP*\n\n${coinEmoji} Result: ${coinResult}` });
      break;
      
    case "8ball":
      const question = args.slice(1).join(" ");
      if (!question) {
        await sock.sendMessage(chatId, { text: "❌ Ask a question! Example: /8ball Will I win?" });
        return;
      }
      const answers = [
        "✅ Yes!", "🎯 Definitely!", "✨ Of course!", "🤔 Maybe...",
        "❌ No!", "🔮 Cannot say", "🌟 Absolutely!", "💭 Ask again later"
      ];
      const answer = answers[Math.floor(Math.random() * answers.length)];
      await sock.sendMessage(chatId, { text: `🎱 *MAGIC 8 BALL*\n\n❓ Q: ${question}\n🔮 A: ${answer}` });
      break;
      
    case "rps":
      const userChoice = args[1]?.toLowerCase();
      const choices = ["rock", "paper", "scissors"];
      if (!userChoice || !choices.includes(userChoice)) {
        await sock.sendMessage(chatId, { text: "❌ Choose: rock, paper, or scissors" });
        return;
      }
      const botChoice = choices[Math.floor(Math.random() * 3)];
      const emojis = { rock: "🪨", paper: "📄", scissors: "✂️" };
      
      let result = "🤝 TIE!";
      if (
        (userChoice === "rock" && botChoice === "scissors") ||
        (userChoice === "paper" && botChoice === "rock") ||
        (userChoice === "scissors" && botChoice === "paper")
      ) {
        result = "🎉 YOU WIN!";
      } else if (userChoice !== botChoice) {
        result = "🤖 I WIN!";
      }
      
      await sock.sendMessage(chatId, { text: 
        `✂️ *ROCK PAPER SCISSORS*\n\n` +
        `You: ${emojis[userChoice]} ${userChoice}\n` +
        `Bot: ${emojis[botChoice]} ${botChoice}\n\n` +
        `🏆 ${result}`
      });
      break;
      
    case "calc":
      const expression = args.slice(1).join("");
      if (!expression) {
        await sock.sendMessage(chatId, { text: "❌ Example: /calc 2+2" });
        return;
      }
      try {
        const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
        const calcResult = eval(sanitized);
        await sock.sendMessage(chatId, { text: `🧮 *CALCULATOR*\n\n${expression} = ${calcResult}` });
      } catch {
        await sock.sendMessage(chatId, { text: "❌ Invalid expression!" });
      }
      break;
      
    case "sticker":
      await sock.sendMessage(chatId, { text: "⚠️ Sticker creation - Feature coming soon in Baileys version!" });
      break;
      
    case "kick":
    case "add":
    case "promote":
    case "demote":
      await sock.sendMessage(chatId, { text: `⚠️ ${command} command - Make sure bot is admin!` });
      break;
      
    default:
      await sock.sendMessage(chatId, { text: "❌ Unknown command. Use /menu to see available commands." });
  }
}

// ==================== REMOVE COMMAND HANDLER ====================
async function handleRemoveCommand(sock, msg, chatId, senderId, isUserAdmin) {
  if (!isUserAdmin) {
    await sock.sendMessage(chatId, { text: '⛔ Only administrators can remove members!' });
    return;
  }
  
  const messageBody = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
  const mentionMatch = messageBody.match(/@(\d+)/);
  
  if (!mentionMatch) {
    await sock.sendMessage(chatId, { text: '❌ Mention a user to remove: !remove @user' });
    return;
  }
  
  const userId = mentionMatch[1] + '@s.whatsapp.net';
  
  try {
    await sock.groupParticipantsUpdate(chatId, [userId], 'remove');
    await sock.sendMessage(chatId, { text: '✅ User removed from group.' });
    console.log(`🗑️ User removed: ${userId}`);
  } catch (error) {
    await sock.sendMessage(chatId, { text: '❌ Failed to remove user. Make me admin!' });
    console.log('Remove failed:', error.message);
  }
}

// ==================== QUESTION HANDLER ====================
async function handleQuestion(sock, chatId, senderId, question) {
  question = question.toLowerCase();
  let response = "";
  
  if (question.includes("who are you") || question.includes("what are you")) {
    response = "I am *HighRon Master*, your group management bot! I maintain order and help members. 🤖✨ Use /menu to see my commands!";
  } else if (question.includes("rules")) {
    response = "📋 *GROUP RULES:*\n\n1️⃣ Respect everyone\n2️⃣ No links without permission\n3️⃣ Don't leave without permission\n4️⃣ Have fun!";
  } else if (question.includes("how are you")) {
    response = "I'm doing great! Ready to help the group! 😊";
  } else {
    const defaultResponses = [
      `*HighRon Master:* Great question @${senderId.split('@')[0]}! Ask the admin for more details. 🤔`,
      `*HighRon Master:* Interesting! What do other members think? 🗣️`,
      `*HighRon Master:* For that, please check with the group admin! 🔍`
    ];
    response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }
  
  await sock.sendMessage(chatId, { 
    text: response,
    mentions: [senderId]
  });
}

// ==================== SCHEDULED TASKS ====================
function initializeScheduledTasks(sock) {
  // Morning greeting at 7:00 AM
  cron.schedule('0 7 * * *', async () => {
    const greetings = [
      '🌅 *GOOD MORNING!* 🌅\n\nMay everyone have a blessed and productive day! ☀️',
      '🌄 *GOOD MORNING, FAMILY!* 🌄\n\nWake up and shine! Today will be amazing! ⭐',
      '⛅ *RISE AND SHINE!* ⛅\n\nGood morning everyone! Let\'s make it happen! 💪',
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    try {
      await sock.sendMessage(TARGET_GROUP_ID, { text: randomGreeting });
      console.log('✅ Morning greeting sent');
    } catch (err) {
      console.log('Failed to send morning greeting:', err.message);
    }
  }, { timezone: BOT_CONFIG.timezone });

  // Tech topic at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    const techTopics = [
      '🤖 *TECH MINUTE*\n\nDid you know the term "Artificial Intelligence" was coined in 1956?',
      '💻 *TECH MINUTE*\n\nThe first computer virus "Elk Cloner" was created in 1983!',
      '📱 *TECH MINUTE*\n\nThe first smartphone (IBM Simon, 1994) cost $1,100!',
      '🔐 *TECH MINUTE*\n\nThe first ransomware attack was in 1989!',
      '🌐 *TECH MINUTE*\n\nThe first website ever is still online at info.cern.ch!',
    ];
    const randomTopic = techTopics[Math.floor(Math.random() * techTopics.length)];
    try {
      await sock.sendMessage(TARGET_GROUP_ID, { text: `*HIGH RON TECH* ⚡\n\n${randomTopic}\n\n💡 Ask me anything with "?"!` });
      console.log('✅ Tech topic sent');
    } catch (err) {
      console.log('Failed to send tech topic:', err.message);
    }
  }, { timezone: BOT_CONFIG.timezone });

  // Evening thanks at 8:00 PM
  cron.schedule('0 20 * * *', async () => {
    const evenings = [
      '🌆 *GOOD EVENING!* 🌆\n\nThanks for today! See you tomorrow! 🌙',
      '🌙 *GOOD NIGHT!* 🌙\n\nRest well everyone! See you tomorrow! ⭐',
      '✨ *END OF DAY* ✨\n\nGreat participation today! Have a wonderful night! 🌟',
    ];
    const randomEvening = evenings[Math.floor(Math.random() * evenings.length)];
    try {
      await sock.sendMessage(TARGET_GROUP_ID, { text: randomEvening });
      console.log('✅ Evening greeting sent');
    } catch (err) {
      console.log('Failed to send evening greeting:', err.message);
    }
  }, { timezone: BOT_CONFIG.timezone });

  // Check for expired mutes every minute
  cron.schedule('* * * * *', () => {
    let changed = false;
    for (const [id, time] of Object.entries(mutedUsers)) {
      if (time < Date.now()) {
        delete mutedUsers[id];
        changed = true;
      }
    }
    if (changed) saveData();
  });

  console.log("✅ Scheduled tasks initialized!");
}

// ==================== START BOT ====================
// Delete auth folder if you want to force new QR code (uncomment if needed)
// if (fs.existsSync('./auth_info')) {
//   fs.rmSync('./auth_info', { recursive: true, force: true });
//   console.log('🗑️ Deleted old auth folder - will generate new QR');
// }

connectToWhatsApp().catch(err => {
  console.error('❌ Failed to start:', err);
});

// ==================== ERROR HANDLING ====================
process.on("unhandledRejection", (reason) => {
  console.log("⚠️ Unhandled rejection:", reason?.message || reason);
});

process.on("uncaughtException", (error) => {
  console.log("⚠️ Uncaught exception:", error.message);
});

console.log('🚀 Bot is starting... Press Ctrl+C to stop\n');