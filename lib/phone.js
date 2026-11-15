/**
 * Phone number helpers (added by Bevon Manyara).
 *
 * Lets owners type numbers the way people actually write them:
 *   0712 345 678  ·  +254 712 345 678  ·  254712345678  ·  712345678
 * and turns them into the international digits WhatsApp uses (254712345678).
 * The default country code comes from COUNTRY_CODE in .env (254 = Kenya).
 */

const DEFAULT_CC = String(process.env.COUNTRY_CODE || '254').replace(/\D/g, '') || '254';

/**
 * Normalise a phone number to international digits, without "+".
 * Returns '' when the input can't be a phone number.
 * @param {string|number} raw
 * @param {string} [countryCode]
 */
function normalizeNumber(raw, countryCode = DEFAULT_CC) {
    if (raw === undefined || raw === null) return '';
    let s = String(raw).trim();
    // Already a WhatsApp JID like 254712345678@s.whatsapp.net or 254712345678:12@s.whatsapp.net
    if (s.includes('@')) s = s.split('@')[0].split(':')[0];
    const hadPlus = s.startsWith('+');
    let digits = s.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('00')) {
        digits = digits.slice(2);                         // 00254... international dialling prefix
    } else if (!hadPlus && digits.startsWith('0')) {
        digits = countryCode + digits.slice(1);           // 0712... local format
    } else if (!hadPlus && digits.length <= 9 && countryCode === '254') {
        digits = countryCode + digits;                    // 712345678 (Kenyan number without the 0)
    }
    // E.164: at most 15 digits; shortest real numbers are about 8
    if (digits.length < 8 || digits.length > 15) return '';
    return digits;
}

/** Normalise and turn into a WhatsApp user JID, or '' if invalid. */
function toJid(raw, countryCode = DEFAULT_CC) {
    const n = normalizeNumber(raw, countryCode);
    return n ? `${n}@s.whatsapp.net` : '';
}

/** The bare number part of a JID / LID ("254712345678:3@s.whatsapp.net" -> "254712345678"). */
function jidNumber(jid) {
    return String(jid || '').split('@')[0].split(':')[0];
}

/** Find the first phone-number-looking thing in free text (e.g. ".sudo add 0712 345 678"). */
function findNumberInText(text, countryCode = DEFAULT_CC) {
    const match = String(text || '').match(/(?:\+|00)?\d[\d\s-]{6,17}\d/);
    return match ? normalizeNumber(match[0], countryCode) : '';
}

module.exports = { normalizeNumber, toJid, jidNumber, findNumberInText, DEFAULT_CC };
