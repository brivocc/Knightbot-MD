/**
 * .setowner <number>  Change the bot owner's number from WhatsApp (added by Bevon Manyara)
 * .setowner           Show the current owner number (masked)
 *
 * Only the bot's own WhatsApp account or the current owner can change it (sudo users cannot).
 * Any format works: 0712 345 678, +254712345678, 254712345678.
 * Saved in data/owner-override.json so it survives restarts; it takes priority over OWNER_NUMBER in .env.
 */
const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const { normalizeNumber, jidNumber } = require('../lib/phone');

const FILE = path.join(__dirname, '..', 'data', 'owner-override.json');
const mask = n => (n.length > 6 ? `+${n.slice(0, 4)}•••${n.slice(-3)}` : n);

async function setOwnerCommand(sock, chatId, message, args) {
    const sender = message.key.participant || message.key.remoteJid;
    const isCurrentOwner = message.key.fromMe || jidNumber(sender) === settings.ownerNumber;
    const raw = String(args || '').trim();

    if (!raw) {
        return sock.sendMessage(chatId, { text: `👑 Current owner: ${mask(settings.ownerNumber)}\nChange it with: .setowner 0712 345 678` }, { quoted: message });
    }
    if (!isCurrentOwner) {
        return sock.sendMessage(chatId, { text: '❌ Only the bot owner can change the owner number.' }, { quoted: message });
    }
    const number = normalizeNumber(raw);
    if (!number) {
        return sock.sendMessage(chatId, { text: '❌ That doesn\'t look like a phone number. Example: .setowner 0712 345 678' }, { quoted: message });
    }
    try {
        fs.writeFileSync(FILE, JSON.stringify({ ownerNumber: number, changedAt: new Date().toISOString() }, null, 2));
    } catch (e) {
        console.error('[setowner] could not save:', e.message);
        return sock.sendMessage(chatId, { text: '❌ Could not save the new owner number. Check the bot has write access to the data folder.' }, { quoted: message });
    }
    const previous = settings.ownerNumber;
    settings.ownerNumber = number; // takes effect immediately, no restart needed
    return sock.sendMessage(chatId, { text: `✅ Owner changed: ${mask(previous)} → ${mask(number)}` }, { quoted: message });
}

module.exports = setOwnerCommand;
