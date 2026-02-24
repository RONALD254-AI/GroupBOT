// index.js - HighRon Master Bot (COMPLETE Version with ALL Commands + RENDER FIXES)
const wppconnect = require('@wppconnect-team/wppconnect');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { execSync } = require('child_process');
const express = require('express'); // ADD THIS FOR RENDER

// ==================== RENDER PORT BINDING (KEEP ALIVE) ====================
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>HighRon Master Bot</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>🤖 HighRon Master Bot</h1>
        <p>Status: <strong style="color: green;">ONLINE</strong></p>
        <p>WhatsApp bot process is running in the background.</p>
        <p><small>Check Render logs for QR code to scan.</small></p>
        <p><small>Version: ${require('./package.json').version}</small></p>
      </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Render health check server running on port ${PORT}`);
});

// ==================== CHROME SETUP (RENDER OPTIMIZED) ====================
console.log('🔍 Checking Chrome installation...');

// First check if we're on Render
const IS_RENDER = fs.existsSync('/usr/bin/google-chrome') || process.env.RENDER === 'true';

const CHROME_PATHS = IS_RENDER ? [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
] : [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\ronal\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
];

function findChrome() {
    for (const chromePath of CHROME_PATHS) {
        if (fs.existsSync(chromePath)) {
            console.log(`✅ Found Chrome at: ${chromePath}`);
            return chromePath;
        }
    }
    return null;
}

const CHROME_PATH = findChrome();

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

function isAdmin(userId) {
  return userId.includes(BOT_CONFIG.adminNumber) || userId.includes(BOT_CONFIG.secondAdminNumber);
}

async function checkIfAdmin(client, groupId, participantId) {
    try {
        const groupInfo = await client.getGroupInfo(groupId);
        if (!groupInfo || !groupInfo.participants) return false;
        const participant = groupInfo.participants.find(p => p.id === participantId);
        return participant ? participant.isAdmin : false;
    } catch (error) {
        console.log('Error checking admin:', error.message);
        return false;
    }
}

console.log('='.repeat(60));
console.log(`🤖 ${BOT_CONFIG.botName} v${BOT_CONFIG.version}`);
console.log('='.repeat(60));

// Create data directory
if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
loadData();

// ==================== BOT INITIALIZATION (RENDER OPTIMIZED) ====================
console.log('🚀 Initializing bot...');

// Prepare browser options for Render
const browserOptions = {
    session: 'highron-bot',
    headless: true,
    disableWelcome: true,
    updatesLog: false,
    waitForLogin: true,
    logQR: true,
    autoClose: 0, // Disable auto-close on Render
    puppeteerOptions: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-breakpad',
            '--window-size=1920,1080'
        ]
    }
};

// Add Chrome path if found
if (CHROME_PATH) {
    console.log(`📱 Using browser from: ${CHROME_PATH}`);
    browserOptions.useChrome = true;
    browserOptions.puppeteerOptions.executablePath = CHROME_PATH;
} else {
    console.log('⚠️ Browser not found, using bundled Chromium...');
    if (IS_RENDER) {
        console.log('📥 On Render - attempting to use system Chrome...');
        browserOptions.useFirefox = true; // Fallback to Firefox on Render
    } else {
        try {
            console.log('📥 Installing Chrome...');
            execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
            console.log('✅ Chrome installed successfully!');
        } catch (installError) {
            console.log('⚠️ Using Firefox instead...');
            browserOptions.useFirefox = true;
        }
    }
}

wppconnect.create(browserOptions).then(client => {
    console.log('✅ BOT INITIALIZED!');
    console.log('📱 ' + (IS_RENDER ? 'CHECK RENDER LOGS FOR QR CODE' : 'Waiting for QR code...') + '\n');
    
    // Handle QR code
    client.onQRUpdated = (qrCode) => {
        console.log('\n' + '='.repeat(60));
        console.log('📱 SCAN THIS QR CODE WITH WHATSAPP:');
        console.log('='.repeat(60));
        qrcode.generate(qrCode, { small: true });
        console.log('='.repeat(60));
        console.log('\n1. Open WhatsApp on your phone');
        console.log('2. Tap Menu > Linked Devices');
        console.log('3. Tap "Link a Device"');
        console.log('4. Scan this QR code\n');
        if (IS_RENDER) {
            console.log('⏰ On Render - You have 60 seconds to scan before timeout!\n');
        }
    };
    
    client.onAuthenticated = () => {
        console.log('✅ Authentication successful!');
    };
    
    client.onReady = () => {
        console.log('\n✅ BOT IS READY AND CONNECTED!');
        console.log('='.repeat(60));
        console.log(`📱 Bot: ${BOT_CONFIG.botName} v${BOT_CONFIG.version}`);
        console.log(`👑 Main Admin: +${BOT_CONFIG.adminNumber}`);
        console.log(`👑 Secondary Admin: +${BOT_CONFIG.secondAdminNumber}`);
        console.log(`🎯 Target Group: ${TARGET_GROUP_ID}`);
        console.log('='.repeat(60));
        
        setTimeout(async () => {
            try {
                await client.sendText(TARGET_GROUP_ID, '🤖 *HighRon Master Bot is now online!*\nUse /menu to see commands.');
                console.log('✅ Welcome message sent to group');
            } catch (err) {
                console.log('⚠️ Could not send welcome message - make sure bot is in the group');
            }
        }, 5000);
        
        // Initialize scheduled tasks
        initializeScheduledTasks(client);
    };
    
    // Handle incoming messages
    client.onMessage(async (message) => {
        // Only process messages from target group
        if (message.from !== TARGET_GROUP_ID) return;
        
        console.log(`\n📨 Message from ${message.sender.pushname || message.sender.id}: ${message.body.substring(0, 50)}...`);
        
        try {
            // Check if sender is admin
            const isUserAdmin = await checkIfAdmin(client, message.from, message.sender.id);
            
            // Check if user is muted
            if (mutedUsers[message.sender.id] && mutedUsers[message.sender.id] > Date.now()) {
                console.log(`🔇 User ${message.sender.id} is muted - deleting message`);
                try {
                    await client.deleteMessage(message.from, message.id.toString(), true);
                } catch (err) {
                    console.log("Error deleting muted message:", err.message);
                }
                return;
            }

            // Check for expired mutes
            if (mutedUsers[message.sender.id] && mutedUsers[message.sender.id] < Date.now()) {
                delete mutedUsers[message.sender.id];
                saveData();
            }
            
            // ANTI-LINK
            if (antilinkEnabled && !isUserAdmin && linkRegex.test(message.body)) {
                try {
                    await client.sendText(message.from, `@${message.sender.id.split('@')[0]} Links are not allowed in this group! Your message was deleted.`, {
                        mentions: [message.sender.id]
                    });
                    await client.deleteMessage(message.from, message.id.toString(), true);
                    console.log('🚫 Link deleted');
                } catch (err) {
                    console.log('Anti-link error:', err.message);
                }
                return;
            }
            
            // COMMANDS
            if (message.body.startsWith(BOT_CONFIG.prefix)) {
                await handleCommand(client, message, isUserAdmin);
                return;
            }
            
            // REMOVE COMMAND
            if (message.body.toLowerCase().startsWith('!remove')) {
                await handleRemoveCommand(client, message, isUserAdmin);
                return;
            }
            
            // QUESTION CHECK
            if (message.body.trim().endsWith('?')) {
                await handleQuestion(client, message);
                return;
            }
            
            // AUTO-REPLY
            for (const [keyword, response] of Object.entries(autoReplyKeywords)) {
                if (message.body.toLowerCase().includes(keyword.toLowerCase())) {
                    await client.sendText(message.from, response);
                    console.log(`🤖 Auto-reply triggered for: ${keyword}`);
                    return;
                }
            }
            
        } catch (err) {
            console.log('Error processing message:', err.message);
        }
    });
    
    // ==================== LEAVE PREVENTION ====================
    client.onParticipantsChanged = async (event) => {
        if (event.act === 'remove' && event.from === TARGET_GROUP_ID) {
            try {
                await client.addParticipant(event.from, event.who);
                console.log(`🔄 User re-added: ${event.who}`);
                
                await client.sendText(event.from, `@${event.who.split('@')[0]} You cannot leave without permission! Adding you back...`, {
                    mentions: [event.who]
                });
            } catch (error) {
                console.log('Leave prevention error:', error.message);
            }
        }
        
        // ==================== GROUP JOIN EVENT ====================
        if (event.act === 'add' && event.from === TARGET_GROUP_ID) {
            try {
                const welcomeMsg = welcomeMessage.replace('@user', `@${event.who.split('@')[0]}`);
                await client.sendText(event.from, welcomeMsg, {
                    mentions: [event.who]
                });
                console.log(`👋 Welcome sent to: ${event.who}`);
            } catch (error) {
                console.log('Welcome error:', error.message);
            }
        }
    };
    
}).catch(error => {
    console.error('❌ Fatal Error:', error);
});

// ==================== COMMAND HANDLER ====================
async function handleCommand(client, message, isUserAdmin) {
    const args = message.body.slice(BOT_CONFIG.prefix.length).trim().split(/ +/);
    const command = args[0].toLowerCase();
    
    console.log(`🎯 Executing command: ${command} from @${message.sender.id.split('@')[0]}`);

    // PUBLIC COMMANDS - Anyone can use these
    const publicCommands = [
        "menu", "ping", "info", "profile", "groupinfo", "status", "test",
        "dice", "coin", "8ball", "rps", "calc", "sticker"
    ];

    // ADMIN ONLY COMMANDS - Only admins can use these
    const adminOnlyCommands = [
        "kick", "add", "promote", "demote", "tagall", "everyone",
        "warn", "unwarn", "mute", "unmute", "antilink", "welcome", "goodbye", "autoreply"
    ];

    // Check if command is admin-only and user is not admin
    if (adminOnlyCommands.includes(command) && !isUserAdmin && !isAdmin(message.sender.id)) {
        await client.sendText(message.from, "❌ Only group administrators can use this command!");
        return;
    }

    // Check if command is valid
    if (!publicCommands.includes(command) && !adminOnlyCommands.includes(command)) {
        await client.sendText(message.from, "❌ Unknown command. Use /menu to see available commands.");
        return;
    }
    
    switch(command) {
        case "menu":
            await client.sendText(message.from, `
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
            `);
            break;
            
        case "ping":
            const start = Date.now();
            await client.sendText(message.from, "🏓 Pong!");
            const end = Date.now();
            await client.sendText(message.from, `🏓 Pong! ${end - start}ms`);
            break;
            
        case "info":
            await client.sendText(message.from, `
🤖 *BOT INFORMATION*

📱 Name: ${BOT_CONFIG.botName}
📊 Version: ${BOT_CONFIG.version}
👑 Main Admin: +${BOT_CONFIG.adminNumber}
👑 Co-Admin: +${BOT_CONFIG.secondAdminNumber}
⚡ Commands: 30+
🛡️ Anti-Link: ${antilinkEnabled ? "ON" : "OFF"}
💎 The most complete WhatsApp bot!
            `);
            break;
            
        case "profile":
            await client.sendText(message.from, `
👤 *YOUR PROFILE*

📱 Name: ${message.sender.pushname || message.sender.id.split('@')[0]}
📞 Number: +${message.sender.id.split('@')[0]}
⚠️ Warnings: ${warnedUsers[message.sender.id] || 0}
🔇 Muted: ${mutedUsers[message.sender.id] ? "Yes" : "No"}
            `);
            break;
            
        case "groupinfo":
            try {
                const groupInfo = await client.getGroupInfo(message.from);
                const admins = groupInfo.participants ? groupInfo.participants.filter(p => p.isAdmin).length : 0;
                await client.sendText(message.from, `
👥 *GROUP INFORMATION*

📌 Name: ${groupInfo.name || "Unnamed"}
📝 About: Exploring the world of Technology and advancing through different activities offered by HighRon Tech
👥 Members: ${groupInfo.participants ? groupInfo.participants.length : "Unknown"}
👑 Admins: ${admins}
🛡️ Anti-Link: ${antilinkEnabled ? "ON" : "OFF"}
                `);
            } catch (err) {
                await client.sendText(message.from, "❌ Could not get group info");
            }
            break;
            
        case "status":
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const mem = process.memoryUsage();
            await client.sendText(message.from, `
📊 *SYSTEM STATUS*

🟢 Status: ONLINE
⏰ Uptime: ${hours}h ${minutes}m
💾 Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB
🛡️ Anti-Link: ${antilinkEnabled ? "ON" : "OFF"}
📋 Auto-Reply: ${Object.keys(autoReplyKeywords).length} rules
            `);
            break;
            
        case "test":
            try {
                const groupInfo = await client.getGroupInfo(message.from);
                const isBotAdmin = groupInfo.participants ? groupInfo.participants.some(p => p.id === client.user?.id && p.isAdmin) : false;
                await client.sendText(message.from, `
🤖 *DIAGNOSTIC REPORT*

✅ Bot Status: ONLINE
👑 Bot Admin: ${isBotAdmin ? "✅ YES" : "❌ NO"}
👤 Your Role: ${isUserAdmin ? "👑 ADMIN" : "👤 MEMBER"}
🎯 Group: ${groupInfo.name || "Unknown"}
👥 Members: ${groupInfo.participants ? groupInfo.participants.length : "Unknown"}
🛡️ Anti-Link: ${antilinkEnabled ? "ON" : "OFF"}
📊 Data Files: OK
⚡ All systems operational!

${isBotAdmin ? "✅ Bot is ready!" : "⚠️ Promote bot to admin for full features!"}
                `);
            } catch (err) {
                await client.sendText(message.from, "❌ Could not get group info");
            }
            break;
            
        case "antilink":
            if (args[1] === "on") {
                antilinkEnabled = true;
                await client.sendText(message.from, "🛡️ Anti-Link activated!");
            } else if (args[1] === "off") {
                antilinkEnabled = false;
                await client.sendText(message.from, "🔓 Anti-Link deactivated!");
            } else {
                await client.sendText(message.from, `🛡️ Anti-Link is ${antilinkEnabled ? "ON" : "OFF"}`);
            }
            saveData();
            break;
            
        case "welcome":
            const newWelcome = args.slice(1).join(" ");
            if (!newWelcome) {
                await client.sendText(message.from, `👋 Current welcome: "${welcomeMessage}"`);
                return;
            }
            welcomeMessage = newWelcome;
            await client.sendText(message.from, `✅ Welcome message updated!`);
            saveData();
            break;
            
        case "goodbye":
            const newGoodbye = args.slice(1).join(" ");
            if (!newGoodbye) {
                await client.sendText(message.from, `👋 Current goodbye: "${goodbyeMessage}"`);
                return;
            }
            goodbyeMessage = newGoodbye;
            await client.sendText(message.from, `✅ Goodbye message updated!`);
            saveData();
            break;
            
        case "autoreply":
            if (args[1] === "list") {
                if (Object.keys(autoReplyKeywords).length === 0) {
                    await client.sendText(message.from, "📋 No auto-reply keywords configured.");
                    return;
                }
                let list = "📋 *Auto-Reply Keywords:*\n";
                for (const [key, val] of Object.entries(autoReplyKeywords)) {
                    list += `• "${key}" → ${val.substring(0, 30)}...\n`;
                }
                await client.sendText(message.from, list);
                return;
            }
            
            const keyword = args[1];
            const response = args.slice(2).join(" ");
            
            if (!keyword || !response) {
                await client.sendText(message.from, "❌ Usage: /autoreply [keyword] [response]");
                return;
            }
            
            autoReplyKeywords[keyword.toLowerCase()] = response;
            await client.sendText(message.from, `✅ Auto-reply set for: "${keyword}"`);
            saveData();
            break;
            
        case "kick":
            await client.sendText(message.from, "⚠️ To kick a user, reply to their message with /kick (Make sure bot is admin)");
            break;
            
        case "add":
            if (!args[1]) {
                await client.sendText(message.from, "❌ Usage: /add 254712345678");
                return;
            }
            const number = args[1].replace(/\D/g, "") + "@c.us";
            try {
                await client.addParticipant(message.from, number);
                await client.sendText(message.from, `✅ +${args[1]} added to the group!`);
            } catch (err) {
                await client.sendText(message.from, "❌ Failed to add user. Make me admin!");
            }
            break;
            
        case "promote":
            if (!message.quotedMsgId) {
                await client.sendText(message.from, "❌ Reply to the user's message you want to promote!");
                return;
            }
            await client.sendText(message.from, "⚠️ Promote command - Make sure bot is admin!");
            break;
            
        case "demote":
            if (!message.quotedMsgId) {
                await client.sendText(message.from, "❌ Reply to the user's message you want to demote!");
                return;
            }
            await client.sendText(message.from, "⚠️ Demote command - Make sure bot is admin!");
            break;
            
        case "tagall":
        case "everyone":
            try {
                const groupInfo = await client.getGroupInfo(message.from);
                if (groupInfo && groupInfo.participants) {
                    const mentions = groupInfo.participants.map(p => p.id);
                    const mentionText = groupInfo.participants.map(p => `@${p.id.split('@')[0]}`).join(" ");
                    await client.sendText(message.from, `📢 *Attention everyone!*\n\n${mentionText}`, { mentions });
                }
            } catch (err) {
                await client.sendText(message.from, "❌ Could not get group participants");
            }
            break;
            
        case "warn":
            if (!message.quotedMsgId) {
                await client.sendText(message.from, "❌ Reply to the user's message you want to warn!");
                return;
            }
            const warnTargetId = message.quotedParticipant || message.quotedMsg?.sender?.id;
            if (warnTargetId) {
                warnedUsers[warnTargetId] = (warnedUsers[warnTargetId] || 0) + 1;
                await client.sendText(message.from, 
                    `⚠️ @${warnTargetId.split('@')[0]} warned! (${warnedUsers[warnTargetId]}/3)`, {
                    mentions: [warnTargetId]
                });
                saveData();
            }
            break;
            
        case "unwarn":
            if (!message.quotedMsgId) {
                await client.sendText(message.from, "❌ Reply to the user's message to remove warning!");
                return;
            }
            const unwarnTargetId = message.quotedParticipant || message.quotedMsg?.sender?.id;
            if (unwarnTargetId && warnedUsers[unwarnTargetId]) {
                warnedUsers[unwarnTargetId] = Math.max(0, warnedUsers[unwarnTargetId] - 1);
                if (warnedUsers[unwarnTargetId] === 0) delete warnedUsers[unwarnTargetId];
                await client.sendText(message.from, `✅ @${unwarnTargetId.split('@')[0]} warning removed!`, {
                    mentions: [unwarnTargetId]
                });
                saveData();
            }
            break;
            
        case "mute":
            if (!message.quotedMsgId) {
                await client.sendText(message.from, "❌ Reply to the user's message you want to mute!");
                return;
            }
            const time = args[1] || "10m";
            const muteTargetId = message.quotedParticipant || message.quotedMsg?.sender?.id;
            
            let muteTime = 10 * 60 * 1000;
            if (time.endsWith('h')) muteTime = parseInt(time) * 60 * 60 * 1000;
            else if (time.endsWith('m')) muteTime = parseInt(time) * 60 * 1000;
            else if (time.endsWith('d')) muteTime = parseInt(time) * 24 * 60 * 60 * 1000;
            
            if (muteTargetId) {
                mutedUsers[muteTargetId] = Date.now() + muteTime;
                await client.sendText(message.from, `🔇 @${muteTargetId.split('@')[0]} muted for ${time}!`, {
                    mentions: [muteTargetId]
                });
                saveData();
            }
            break;
            
        case "unmute":
            if (!message.quotedMsgId) {
                await client.sendText(message.from, "❌ Reply to the user's message to unmute!");
                return;
            }
            const unmuteTargetId = message.quotedParticipant || message.quotedMsg?.sender?.id;
            if (unmuteTargetId && mutedUsers[unmuteTargetId]) {
                delete mutedUsers[unmuteTargetId];
                await client.sendText(message.from, `🔊 @${unmuteTargetId.split('@')[0]} unmuted!`, {
                    mentions: [unmuteTargetId]
                });
                saveData();
            }
            break;
            
        case "dice":
            const diceResult = Math.floor(Math.random() * 6) + 1;
            const diceEmojis = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
            await client.sendText(message.from, `🎲 *DICE*\n\n${diceEmojis[diceResult-1]} Result: ${diceResult}`);
            break;
            
        case "coin":
            const coinResult = Math.random() < 0.5 ? "HEADS" : "TAILS";
            const coinEmoji = coinResult === "HEADS" ? "🪙" : "👑";
            await client.sendText(message.from, `🪙 *COIN FLIP*\n\n${coinEmoji} Result: ${coinResult}`);
            break;
            
        case "8ball":
            const question = args.slice(1).join(" ");
            if (!question) {
                await client.sendText(message.from, "❌ Ask a question! Example: /8ball Will I win?");
                return;
            }
            const answers = [
                "✅ Yes!", "🎯 Definitely!", "✨ Of course!", "🤔 Maybe...",
                "❌ No!", "🔮 Cannot say", "🌟 Absolutely!", "💭 Ask again later"
            ];
            const answer = answers[Math.floor(Math.random() * answers.length)];
            await client.sendText(message.from, `🎱 *MAGIC 8 BALL*\n\n❓ Q: ${question}\n🔮 A: ${answer}`);
            break;
            
        case "rps":
            const userChoice = args[1]?.toLowerCase();
            const choices = ["rock", "paper", "scissors"];
            if (!userChoice || !choices.includes(userChoice)) {
                await client.sendText(message.from, "❌ Choose: rock, paper, or scissors");
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
            
            await client.sendText(message.from, 
                `✂️ *ROCK PAPER SCISSORS*\n\n` +
                `You: ${emojis[userChoice]} ${userChoice}\n` +
                `Bot: ${emojis[botChoice]} ${botChoice}\n\n` +
                `🏆 ${result}`
            );
            break;
            
        case "calc":
            const expression = args.slice(1).join("");
            if (!expression) {
                await client.sendText(message.from, "❌ Example: /calc 2+2");
                return;
            }
            try {
                const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
                const calcResult = eval(sanitized);
                await client.sendText(message.from, `🧮 *CALCULATOR*\n\n${expression} = ${calcResult}`);
            } catch {
                await client.sendText(message.from, "❌ Invalid expression!");
            }
            break;
            
        case "sticker":
            if (!message.quotedMsgId) {
                await client.sendText(message.from, "❌ Reply to an image with /sticker");
                return;
            }
            await client.sendText(message.from, "⚠️ Sticker creation - Make sure you replied to an image!");
            break;
            
        default:
            await client.sendText(message.from, "❌ Unknown command. Use /menu to see available commands.");
    }
}

// ==================== REMOVE COMMAND HANDLER ====================
async function handleRemoveCommand(client, message, isUserAdmin) {
    if (!isUserAdmin) {
        await client.sendText(message.from, '⛔ Only administrators can remove members!');
        return;
    }
    
    const mentionMatch = message.body.match(/@(\d+)/);
    if (!mentionMatch) {
        await client.sendText(message.from, '❌ Mention a user to remove: !remove @user');
        return;
    }
    
    const userId = mentionMatch[1] + '@c.us';
    
    try {
        await client.removeParticipant(message.from, userId);
        await client.sendText(message.from, '✅ User removed from group.');
        console.log(`🗑️ User removed: ${userId}`);
    } catch (error) {
        await client.sendText(message.from, '❌ Failed to remove user. Make me admin!');
        console.log('Remove failed:', error.message);
    }
}

// ==================== QUESTION HANDLER ====================
async function handleQuestion(client, message) {
    const question = message.body.toLowerCase();
    let response = "";
    
    if (question.includes("who are you") || question.includes("what are you")) {
        response = "I am *HighRon Master*, your group management bot! I maintain order and help members. 🤖✨ Use /menu to see my commands!";
    } else if (question.includes("rules")) {
        response = "📋 *GROUP RULES:*\n\n1️⃣ Respect everyone\n2️⃣ No links without permission\n3️⃣ Don't leave without permission\n4️⃣ Have fun!";
    } else if (question.includes("how are you")) {
        response = "I'm doing great! Ready to help the group! 😊";
    } else {
        const defaultResponses = [
            `*HighRon Master:* Great question @${message.sender.id.split('@')[0]}! Ask the admin for more details. 🤔`,
            `*HighRon Master:* Interesting! What do other members think? 🗣️`,
            `*HighRon Master:* For that, please check with the group admin! 🔍`
        ];
        response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
    
    await client.sendText(message.from, response, {
        mentions: [message.sender.id]
    });
}

// ==================== SCHEDULED TASKS ====================
function initializeScheduledTasks(client) {
    // Morning greeting at 7:00 AM
    cron.schedule('0 7 * * *', async () => {
        const greetings = [
            '🌅 *GOOD MORNING!* 🌅\n\nMay everyone have a blessed and productive day! ☀️',
            '🌄 *GOOD MORNING, FAMILY!* 🌄\n\nWake up and shine! Today will be amazing! ⭐',
            '⛅ *RISE AND SHINE!* ⛅\n\nGood morning everyone! Let\'s make it happen! 💪',
        ];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        try {
            await client.sendText(TARGET_GROUP_ID, randomGreeting);
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
            await client.sendText(TARGET_GROUP_ID, `*HIGH RON TECH* ⚡\n\n${randomTopic}\n\n💡 Ask me anything with "?"!`);
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
            await client.sendText(TARGET_GROUP_ID, randomEvening);
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

// ==================== ERROR HANDLING ====================
process.on("unhandledRejection", (reason) => {
    console.log("⚠️ Unhandled rejection:", reason?.message || reason);
});

process.on("uncaughtException", (error) => {
    console.log("⚠️ Uncaught exception:", error.message);
});

console.log('🚀 Bot is starting... Press Ctrl+C to stop\n');