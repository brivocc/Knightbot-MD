/**
 * Kenyan commands (added by Bevon Manyara)
 *   .holidays [year]          Kenyan public holidays
 *   .county <name|number>     County number and headquarters (all 47 counties)
 *   .kes <amount> <CUR>       Convert a foreign amount to Kenya shillings   (.kes 100 usd)
 *   .kes <amount> to <CUR>    Convert Kenya shillings to another currency   (.kes 5000 to usd)
 *   .sheng <word>             Meaning of common Sheng words
 *
 * The pure helpers are exported so they can be tested without WhatsApp (see test/kenya.test.js).
 */
const axios = require('axios');

// ---------- Public holidays ----------
function easterSunday(year) {
    // Anonymous Gregorian algorithm
    const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
}

function kenyanHolidays(year) {
    const d = (m, day) => new Date(Date.UTC(year, m - 1, day));
    const easter = easterSunday(year);
    const plus = (date, n) => new Date(date.getTime() + n * 864e5);
    const list = [
        [d(1, 1), "New Year's Day"],
        [plus(easter, -2), 'Good Friday'],
        [plus(easter, 1), 'Easter Monday'],
        [d(5, 1), 'Labour Day'],
        [d(6, 1), 'Madaraka Day'],
        [d(10, 10), 'Mazingira Day'],
        [d(10, 20), 'Mashujaa Day'],
        [d(12, 12), 'Jamhuri Day'],
        [d(12, 25), 'Christmas Day'],
        [d(12, 26), 'Boxing Day'],
    ];
    return list
        .sort((x, y) => x[0] - y[0])
        .map(([date, name]) => ({ date, name, sunday: date.getUTCDay() === 0 }));
}

function formatHolidays(year, today = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-KE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const lines = kenyanHolidays(year).map(h => {
        const past = h.date.getTime() < todayUTC;
        return `${past ? '▫️' : '🇰🇪'} ${fmt.format(h.date)} · ${h.name}${h.sunday ? ' (Sunday: Monday is off)' : ''}`;
    });
    const next = kenyanHolidays(year).find(h => h.date.getTime() >= todayUTC);
    return [`*Kenyan public holidays ${year}*`, '', ...lines, '',
        "Also: Idd-ul-Fitr (date announced by Gazette notice each year).",
        next && year === today.getFullYear()
            ? `Next: *${next.name}* in ${Math.round((next.date.getTime() - todayUTC) / 864e5)} day(s).` : '',
        '_Dates can change by Gazette notice._'].filter(Boolean).join('\n');
}

// ---------- Counties ----------
const COUNTIES = [
    'Mombasa|Mombasa', 'Kwale|Kwale', 'Kilifi|Kilifi', 'Tana River|Hola', 'Lamu|Lamu', 'Taita-Taveta|Mwatate', 'Garissa|Garissa',
    'Wajir|Wajir', 'Mandera|Mandera', 'Marsabit|Marsabit', 'Isiolo|Isiolo', 'Meru|Meru', 'Tharaka-Nithi|Kathwana', 'Embu|Embu',
    'Kitui|Kitui', 'Machakos|Machakos', 'Makueni|Wote', 'Nyandarua|Ol Kalou', 'Nyeri|Nyeri', 'Kirinyaga|Kerugoya',
    "Murang'a|Murang'a", 'Kiambu|Kiambu', 'Turkana|Lodwar', 'West Pokot|Kapenguria', 'Samburu|Maralal', 'Trans Nzoia|Kitale',
    'Uasin Gishu|Eldoret', 'Elgeyo-Marakwet|Iten', 'Nandi|Kapsabet', 'Baringo|Kabarnet', 'Laikipia|Rumuruti', 'Nakuru|Nakuru',
    'Narok|Narok', 'Kajiado|Kajiado', 'Kericho|Kericho', 'Bomet|Bomet', 'Kakamega|Kakamega', 'Vihiga|Mbale', 'Bungoma|Bungoma',
    'Busia|Busia', 'Siaya|Siaya', 'Kisumu|Kisumu', 'Homa Bay|Homa Bay', 'Migori|Migori', 'Kisii|Kisii', 'Nyamira|Nyamira',
    'Nairobi|Nairobi',
].map((s, i) => { const [name, hq] = s.split('|'); return { code: i + 1, name, hq }; });

const simplify = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function findCounty(query) {
    const q = String(query || '').trim();
    if (!q) return null;
    if (/^\d{1,3}$/.test(q)) return COUNTIES.find(c => c.code === Number(q)) || null;
    const s = simplify(q);
    return COUNTIES.find(c => simplify(c.name) === s) || COUNTIES.find(c => simplify(c.name).startsWith(s)) || null;
}

// ---------- Currency ----------
const rateCache = new Map(); // base -> { at, rates }
async function getRates(base) {
    const hit = rateCache.get(base);
    if (hit && Date.now() - hit.at < 60 * 60 * 1000) return hit.rates;
    const { data } = await axios.get(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, { timeout: 10000 });
    if (data?.result !== 'success' || !data.rates) throw new Error('Rates unavailable');
    rateCache.set(base, { at: Date.now(), rates: data.rates });
    return data.rates;
}

/** Parse ".kes 100 usd" or ".kes 5,000 to eur" -> { amount, from, to } or null */
function parseKes(args) {
    const parts = String(args || '').trim().toLowerCase().replace(/,/g, '').split(/\s+/).filter(Boolean);
    const amount = Number(parts[0]);
    if (!(amount > 0) || amount > 1e12) return null;
    if (parts[1] === 'to' && /^[a-z]{3}$/.test(parts[2] || '')) return { amount, from: 'KES', to: parts[2].toUpperCase() };
    if (/^[a-z]{3}$/.test(parts[1] || '')) return { amount, from: parts[1].toUpperCase(), to: 'KES' };
    return null;
}

const money = (n, cur) => `${cur} ${n.toLocaleString('en-KE', { maximumFractionDigits: n < 1 ? 4 : 2 })}`;

// ---------- Sheng ----------
const SHENG = {
    sasa: 'Hi / what\'s up (greeting). Reply: "Poa".', niaje: 'Hi, how are you?', vipi: 'How are you? / What\'s up?',
    poa: 'Cool, fine, okay.', fiti: 'Fine, good, healthy.', msee: 'A guy, a person.', manze: 'Man! (exclamation, like "dude").',
    mbogi: 'A crew, a group of friends.', beshte: 'Best friend.', dame: 'A young woman.', buda: 'Father, dad.', mathe: 'Mother, mum.',
    keja: 'House, home, a rented room.', mathree: 'Matatu (public minibus).', nduthi: 'Motorbike, boda boda.',
    doh: 'Money.', chapaa: 'Money.', ganji: 'Money.', noma: 'Serious, intense; also "awesome".', rada: 'Info, the plan ("niko rada" = I\'m informed).',
    ocha: 'Upcountry, rural home.', fala: 'Fool (rude).', kuhepa: 'To escape, to run away.', form: 'Plan, event ("form ni gani?" = what\'s the plan?).',
    wueh: 'Wow! (surprise).', base: 'Hangout spot.', toto: 'A child; also a young woman.',
};

// ---------- WhatsApp handlers ----------
const reply = (sock, chatId, message, text) => sock.sendMessage(chatId, { text }, { quoted: message });

async function holidaysCommand(sock, chatId, message, args) {
    const year = /^\d{4}$/.test(String(args).trim()) ? Number(args) : new Date().getFullYear();
    if (year < 2010 || year > 2100) return reply(sock, chatId, message, 'Please give a year between 2010 and 2100, e.g. .holidays 2027');
    return reply(sock, chatId, message, formatHolidays(year));
}

async function countyCommand(sock, chatId, message, args) {
    if (!String(args).trim()) {
        return reply(sock, chatId, message, 'Usage: .county <name or number>\nExamples: .county Nakuru · .county 47\nType .county list for all 47.');
    }
    if (simplify(args) === 'list') {
        return reply(sock, chatId, message, '*Kenya\'s 47 counties*\n' + COUNTIES.map(c => `${String(c.code).padStart(3, '0')} ${c.name}`).join('\n'));
    }
    const c = findCounty(args);
    if (!c) return reply(sock, chatId, message, `I couldn't find a county called "${args}". Type .county list to see all 47.`);
    return reply(sock, chatId, message, `🇰🇪 *${c.name} County*\nCounty number: ${String(c.code).padStart(3, '0')}\nHeadquarters: ${c.hq}`);
}

async function kesCommand(sock, chatId, message, args) {
    const q = parseKes(args);
    if (!q) return reply(sock, chatId, message, 'Usage:\n.kes 100 usd → US$100 in Kenya shillings\n.kes 5000 to eur → KES 5,000 in euros');
    try {
        const rates = await getRates(q.from);
        const rate = rates[q.to];
        if (!rate) return reply(sock, chatId, message, `Sorry, I don't know the currency "${q.to === 'KES' ? q.from : q.to}".`);
        return reply(sock, chatId, message,
            `💱 ${money(q.amount, q.from)} = *${money(q.amount * rate, q.to)}*\nRate: 1 ${q.from} = ${rate} ${q.to}\n_Indicative rate, not a bank quote._`);
    } catch (e) {
        console.error('[kes] rate lookup failed:', e.message);
        return reply(sock, chatId, message, 'Exchange rates are unavailable right now. Please try again later.');
    }
}

async function shengCommand(sock, chatId, message, args) {
    const word = simplify(args);
    if (!word) return reply(sock, chatId, message, `Usage: .sheng <word>\nI know: ${Object.keys(SHENG).sort().join(', ')}`);
    const meaning = SHENG[word];
    return reply(sock, chatId, message, meaning ? `🗣️ *${word}*: ${meaning}`
        : `I don't know "${args}" yet. I know: ${Object.keys(SHENG).sort().join(', ')}`);
}

module.exports = {
    holidaysCommand, countyCommand, kesCommand, shengCommand,
    // exported for tests
    easterSunday, kenyanHolidays, formatHolidays, findCounty, parseKes, COUNTIES, SHENG,
};
