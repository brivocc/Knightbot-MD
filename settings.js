require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { normalizeNumber } = require('./lib/phone');

// Easy number setup (Bevon Manyara): put your details in a .env file (see .env.example) instead of editing code.
// Numbers can be written any way: 0712 345 678, +254712345678 or 254712345678.
// The owner can also change the owner number from WhatsApp with .setowner <number>; that choice is kept in
// data/owner-override.json and wins over .env.
function savedOwnerNumber() {
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'owner-override.json'), 'utf8'));
    return normalizeNumber(saved.ownerNumber);
  } catch {
    return '';
  }
}

const settings = {
  packname: process.env.PACK_NAME || 'Knight Bot',
  author: '‎',
  botName: process.env.BOT_NAME || "Knight Bot",
  botOwner: process.env.OWNER_NAME || 'Professor', // Your name
  // Owner number: .setowner (saved) > OWNER_NUMBER in .env > default below
  ownerNumber: savedOwnerNumber() || normalizeNumber(process.env.OWNER_NUMBER) || '919876543210',
  // Number to link (pair) the bot with. Defaults to the owner number.
  pairingNumber: normalizeNumber(process.env.PAIRING_NUMBER) || '',
  // Seconds a user must wait between commands (anti-spam). Owner and sudo users are exempt. 0 = off.
  commandCooldown: Math.max(0, Number(process.env.COMMAND_COOLDOWN ?? 3) || 0),
  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: "public",
  maxStoreMessages: 20, 
  storeWriteInterval: 10000,
  description: "This is a bot for managing group commands and automating tasks.",
  version: "3.0.8",
  updateZipUrl: "https://github.com/mruniquehacker/Knightbot-MD/archive/refs/heads/main.zip",
  // Media / Knight API (song, video, cards, etc.)
  knightApiUrl: process.env.KNIGHT_API_URL || 'https://knightbotapi.stream',
  knightApiKey: process.env.KNIGHT_API_KEY || 'knight',
  mediaApiUrl: process.env.MEDIA_API_URL || 'https://knightbotapi.stream',
  mediaApiKey: process.env.MEDIA_API_KEY || 'knight',
  princeApiUrl: process.env.PRINCE_API_URL || 'https://api.princetechn.com',
  princeApiKey: process.env.PRINCE_API_KEY || 'prince',
};

module.exports = settings;
