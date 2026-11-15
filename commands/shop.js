/**
 * WhatsApp shop & customer care (added by Bevon Manyara)
 *
 * CUSTOMERS (private chat, no dot needed):
 *   hi / menu        welcome menu          1  products & prices     2  my cart        3  checkout
 *   4  my orders     5  how to pay         6  delivery & hours      7  talk to a person
 *   add P3 [qty]     add to cart           remove P3 / clear cart
 *   paid QJK1A2B3C4  send the M-Pesa code for your latest order
 *   anything else    FAQ answer, or the AI assistant (if ANTHROPIC_API_KEY is set)
 *
 * OWNER / SUDO (any chat):
 *   .shop                       status + owner help        .shop on|off      .shopai on|off
 *   .shopset <field> <value>    name, till, paybill, account, hours, location, delivery, welcome
 *   .addproduct Name | price | stock | category | description
 *   .editproduct P3 <name|price|stock|category|desc> <value>     .delproduct P3     .items
 *   .addfaq word1, word2 | answer        .faqs        .delfaq <number>
 *   .orders [all|paid|delivered]   .order ORD1001   .paid ORD1001   .delivered ORD1001   .cancelorder ORD1001
 *   .reply <ORD1001|T3> <message>  message a customer through the bot
 */
const store = require('../lib/shop/store');
const ai = require('../lib/shop/ai');
const settings = require('../settings');
const { jidNumber } = require('../lib/phone');

const kes = n => 'KES ' + Number(n).toLocaleString('en-KE');
const ownerJid = () => settings.ownerNumber + '@s.whatsapp.net';
const STATUS = {
    awaiting_payment: '⏳ Awaiting payment', payment_submitted: '🔎 Payment being confirmed',
    paid: '✅ Paid, preparing delivery', delivered: '📦 Delivered', cancelled: '❌ Cancelled',
};
const GREETINGS = /^(hi+|hello|hey|habari|hallo|sasa|niaje|mambo|vipi|menu|start|help|0|\.menu|\.help|\.shop)$/;
const MPESA_CODE = /\b([A-Z0-9]{10})\b/;

const send = (sock, jid, text, quoted) => sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
const customerLabel = jid => (jid.endsWith('@s.whatsapp.net') ? '+' + jidNumber(jid) : 'customer');

async function notifyOwner(sock, text) {
    try { await sock.sendMessage(ownerJid(), { text: `🛒 *Shop alert*\n${text}` }); } catch (e) { console.error('[shop] owner alert failed:', e.message); }
}

// ---------------- Customer screens ----------------
function menuText() {
    const s = store.shop().settings;
    return (s.welcome ? s.welcome + '\n\n' : `👋 Welcome to *${s.name}*!\n\n`) +
        'Reply with a number:\n1️⃣ Products & prices\n2️⃣ My cart\n3️⃣ Checkout\n4️⃣ My orders\n5️⃣ How to pay\n' +
        '6️⃣ Delivery & opening hours\n7️⃣ Talk to a person\n\nOr just ask me anything 🙂';
}

function productsText(filter = '') {
    const f = filter.trim().toLowerCase();
    const items = store.shop().products.filter(p => !f || p.category.toLowerCase().includes(f) || p.name.toLowerCase().includes(f));
    if (!items.length) return f ? `No products match "${filter}". Reply *1* to see everything.` : 'No products yet. Please check back soon.';
    const byCat = {};
    for (const p of items) (byCat[p.category] = byCat[p.category] || []).push(p);
    const lines = [];
    for (const [cat, list] of Object.entries(byCat)) {
        lines.push(`\n*${cat}*`);
        for (const p of list) lines.push(`*${p.code}* ${p.name}: ${kes(p.price)}${p.stock > 0 ? '' : ' _(out of stock)_'}`);
    }
    return `🛍️ *Our products*${lines.join('\n')}\n\nTo buy, reply *add P1* (or *add P1 2* for two).\nAsk about any item for details.`;
}

function cartText(jid) {
    const lines = store.cartLines(jid);
    if (!lines.length) return '🛒 Your cart is empty. Reply *1* to see products.';
    const body = lines.map(l => `• ${l.qty} × ${l.product.name} (${l.product.code}): ${kes(l.product.price * l.qty)}`).join('\n');
    return `🛒 *Your cart*\n${body}\n\n*Total: ${kes(store.cartTotal(jid))}*\n\nReply *3* to checkout, *remove P1* to remove an item, or *clear cart*.`;
}

function payText(order) {
    const s = store.shop().settings;
    const ways = [];
    if (s.till) ways.push(`*M-Pesa Buy Goods*\nTill number: *${s.till}*`);
    if (s.paybill) ways.push(`*M-Pesa Paybill*\nBusiness no: *${s.paybill}*\nAccount: *${s.account || (order ? order.id : 'your order number')}*`);
    if (!ways.length) ways.push('Payment details will be shared by our team shortly.');
    return `💳 *How to pay*${order ? `\nAmount: *${kes(order.total)}*` : ''}\n\n${ways.join('\n\n')}\n\nAfter paying, reply *paid* followed by the M-Pesa code, e.g. *paid QJK1A2B3C4*.`;
}

function infoText() {
    const s = store.shop().settings;
    return `📍 *Location:* ${s.location}\n🕘 *Hours:* ${s.hours}\n🚚 *Delivery:* ${s.delivery}`;
}

function ordersText(jid) {
    const mine = store.shop().orders.filter(o => o.customer === jid).slice(-5).reverse();
    if (!mine.length) return 'You have no orders yet. Reply *1* to see products.';
    return '📦 *Your orders*\n' + mine.map(o => `*${o.id}*: ${kes(o.total)} · ${STATUS[o.status] || o.status}`).join('\n') +
        (mine.some(o => o.status === 'awaiting_payment') ? '\n\nReply *5* for payment details.' : '');
}

function faqAnswer(text) {
    const t = ' ' + text.toLowerCase() + ' ';
    const hit = store.shop().faqs.find(f => f.keywords.some(k => k && t.includes(k.toLowerCase())));
    return hit ? hit.answer : null;
}

async function handoff(sock, jid, text, reason) {
    const s = store.shop();
    s.tickets = s.tickets || [];
    const id = 'T' + (s.tickets.length + 1);
    s.tickets.push({ id, jid, text: String(text).slice(0, 300), at: new Date().toISOString() });
    store.save();
    await notifyOwner(sock, `🙋 *${id}* ${customerLabel(jid)} needs a person (${reason}):\n"${String(text).slice(0, 300)}"\n\nReply with: .reply ${id} <your message>`);
}

// ---------------- Customer conversation ----------------
async function handleCustomer(sock, message, jid, rawText) {
    const text = String(rawText || '').trim();
    const t = text.toLowerCase();
    const c = store.cart(jid);

    // Checkout steps take priority
    if (c.stage && /^(cancel|stop|ghairi)$/.test(t)) {
        delete c.stage; store.save();
        return send(sock, jid, 'Checkout cancelled. Your cart is saved. Reply *2* to see it.', message);
    }
    if (c.stage === 'name') {
        if (text.length < 2) return send(sock, jid, 'Please type your name (or *cancel*).', message);
        c.name = text.slice(0, 60); c.stage = 'location'; store.save();
        return send(sock, jid, `Thanks ${c.name.split(' ')[0]}! 📍 Where should we deliver? (estate/town and a landmark)\n\n${store.shop().settings.delivery}`, message);
    }
    if (c.stage === 'location') {
        if (text.length < 3) return send(sock, jid, 'Please type your delivery location (or *cancel*).', message);
        c.location = text.slice(0, 120); c.stage = 'confirm'; store.save();
        return send(sock, jid, `${cartText(jid).split('\n\nReply')[0]}\n\n👤 ${c.name}\n📍 ${c.location}\n\nReply *yes* to place the order or *cancel*.`, message);
    }
    if (c.stage === 'confirm') {
        if (!/^(yes|y|ok|confirm|ndio|sawa)$/.test(t)) return send(sock, jid, 'Reply *yes* to place the order, or *cancel*.', message);
        const unavailable = store.cartLines(jid).filter(l => l.product.stock < l.qty);
        if (unavailable.length) {
            delete c.stage; store.save();
            return send(sock, jid, `Sorry, not enough stock for: ${unavailable.map(l => `${l.product.name} (${l.product.stock} left)`).join(', ')}. Please update your cart.`, message);
        }
        const order = store.createOrder(jid, { name: c.name, location: c.location });
        if (!order) return send(sock, jid, 'Your cart is empty. Reply *1* to see products.', message);
        await send(sock, jid, `🎉 Order *${order.id}* placed! Total *${kes(order.total)}*.\n\n${payText(order)}`, message);
        return notifyOwner(sock, `🆕 New order *${order.id}* from ${order.name} (${customerLabel(jid)})\n` +
            order.items.map(i => `• ${i.qty} × ${i.name}`).join('\n') + `\nTotal: ${kes(order.total)}\n📍 ${order.location}\n\nWhen paid: .paid ${order.id}`);
    }

    if (GREETINGS.test(t)) return send(sock, jid, menuText(), message);
    if (/^(1|products?|catalog(ue)?|prices?|bei|items?|shop)(\s+.+)?$/.test(t)) return send(sock, jid, productsText(t.replace(/^\S+\s*/, '')), message);
    if (/^(2|cart|my cart|basket)$/.test(t)) return send(sock, jid, cartText(jid), message);
    if (/^(4|orders?|my orders?|status|track)$/.test(t)) return send(sock, jid, ordersText(jid), message);
    if (/^(5|pay|payment|how to pay|mpesa|m-pesa|lipa)$/.test(t)) {
        const open = store.shop().orders.filter(o => o.customer === jid && o.status === 'awaiting_payment').pop();
        return send(sock, jid, payText(open), message);
    }
    if (/^(6|delivery|location|where|hours|open|address)$/.test(t)) return send(sock, jid, infoText(), message);
    if (/^(7|agent|human|person|talk to (a )?person|mtu|customer care)$/.test(t)) {
        await handoff(sock, jid, text, 'asked for a person');
        return send(sock, jid, '🙋 Got it! A team member will reply to you here shortly.', message);
    }
    if (/^(3|checkout|check out|order|place order|nunua)$/.test(t)) {
        if (!store.cartLines(jid).length) return send(sock, jid, 'Your cart is empty. Reply *1* to see products, then *add P1* to add one.', message);
        c.stage = 'name'; store.save();
        return send(sock, jid, `${cartText(jid).split('\n\nReply')[0]}\n\n👤 What name should we put on the order? (or *cancel*)`, message);
    }

    // add P3 [2]  /  buy P3 x2  /  P3
    let m = t.match(/^(?:add|buy|nunua|want)?\s*(p\d+)\s*(?:x|\*)?\s*(\d{1,2})?$/);
    if (m) {
        const product = store.findProduct(m[1]);
        const qty = Math.max(1, Number(m[2] || 1));
        if (!product) return send(sock, jid, `I couldn't find ${m[1].toUpperCase()}. Reply *1* to see product codes.`, message);
        if (product.stock <= 0) return send(sock, jid, `Sorry, *${product.name}* is out of stock right now. Reply *1* for other products.`, message);
        const line = c.items.find(i => i.code === product.code);
        const newQty = Math.min(product.stock, (line ? line.qty : 0) + qty);
        if (line) line.qty = newQty; else c.items.push({ code: product.code, qty: newQty });
        store.save();
        return send(sock, jid, `✅ Added *${product.name}* (${kes(product.price)}) to your cart.\n\n${cartText(jid)}`, message);
    }
    m = t.match(/^(?:remove|delete|ondoa)\s+(p\d+)$/);
    if (m) {
        const before = c.items.length;
        c.items = c.items.filter(i => i.code.toLowerCase() !== m[1]);
        store.save();
        return send(sock, jid, before === c.items.length ? `${m[1].toUpperCase()} isn't in your cart.` : cartText(jid), message);
    }
    if (/^(clear|empty)( cart)?$/.test(t)) { c.items = []; store.save(); return send(sock, jid, '🧹 Cart cleared.', message); }

    // paid QJK1A2B3C4
    if (/^(paid|nimelipa|payment|lipa)\b/.test(t) || (MPESA_CODE.test(text.toUpperCase()) && /confirmed|ksh|kes/i.test(text))) {
        const code = (text.toUpperCase().match(MPESA_CODE) || [])[1];
        const order = store.shop().orders.filter(o => o.customer === jid && o.status === 'awaiting_payment').pop();
        if (!order) return send(sock, jid, 'I can\'t find an order waiting for payment. Reply *4* to see your orders.', message);
        if (!code) return send(sock, jid, 'Please send the M-Pesa code too, e.g. *paid QJK1A2B3C4*.', message);
        order.mpesaCode = code; store.setOrderStatus(order, 'payment_submitted');
        await send(sock, jid, `🙏 Thanks! We're confirming payment *${code}* for order *${order.id}*. You'll get a message once it's confirmed.`, message);
        return notifyOwner(sock, `💰 Payment submitted for *${order.id}* (${kes(order.total)}): M-Pesa code *${code}*\nCheck your M-Pesa statement, then: .paid ${order.id}`);
    }

    const faq = faqAnswer(text);
    if (faq) return send(sock, jid, faq, message);

    const reply = await ai.answer(jid, text);
    if (reply) {
        await send(sock, jid, reply.text, message);
        if (reply.handoff) await handoff(sock, jid, text, 'AI passed it on');
        return;
    }
    return send(sock, jid, `Sorry, I didn't get that 🙏\n\n${menuText()}`, message);
}

// ---------------- Owner commands ----------------
const OWNER_CMDS = ['.shop', '.shopset', '.shopai', '.addproduct', '.editproduct', '.delproduct', '.items', '.stock', '.addfaq', '.faqs',
    '.delfaq', '.orders', '.order', '.paid', '.delivered', '.cancelorder', '.reply'];

function ownerHelp() {
    const s = store.shop();
    const st = s.settings;
    const open = s.orders.filter(o => ['awaiting_payment', 'payment_submitted', 'paid'].includes(o.status)).length;
    return `🛒 *${st.name}*: shop is *${st.enabled ? 'ON' : 'OFF'}*, AI assistant *${st.ai !== false ? (ai.available() ? 'ON' : 'ON but no ANTHROPIC_API_KEY') : 'OFF'}*\n` +
        `${s.products.length} products · ${open} open orders\n\n` +
        '*Settings*\n.shop on|off · .shopai on|off\n.shopset name|till|paybill|account|hours|location|delivery|welcome <value>\n\n' +
        '*Products*\n.addproduct Name | price | stock | category | description\n.editproduct P3 price 2500\n.stock P3 10 · .delproduct P3 · .items\n\n' +
        '*FAQs*\n.addfaq warranty, guarantee | All phones have 1-year warranty\n.faqs · .delfaq 2\n\n' +
        '*Orders*\n.orders [all|paid|delivered] · .order ORD1001\n.paid ORD1001 · .delivered ORD1001 · .cancelorder ORD1001\n.reply ORD1001 Your parcel is on the way 🚚';
}

async function handleOwnerCommand(sock, message, chatId, rawText) {
    const text = String(rawText || '').trim();
    const [cmdRaw, ...rest] = text.split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const args = text.slice(cmdRaw.length).trim();
    const s = store.shop();
    const say = t => send(sock, chatId, t, message);

    switch (cmd) {
        case '.shop':
            if (/^(on|off)$/i.test(args)) { s.settings.enabled = args.toLowerCase() === 'on'; store.save(); return say(`Shop is now *${s.settings.enabled ? 'ON' : 'OFF'}*.`); }
            return say(ownerHelp());
        case '.shopai':
            if (!/^(on|off)$/i.test(args)) return say('Usage: .shopai on|off');
            s.settings.ai = args.toLowerCase() === 'on'; store.save();
            return say(`AI assistant *${s.settings.ai ? 'ON' : 'OFF'}*${s.settings.ai && !ai.available() ? ' (add ANTHROPIC_API_KEY to .env to activate it)' : ''}.`);
        case '.shopset': {
            const [field, ...v] = args.split(/\s+/);
            const fields = ['name', 'till', 'paybill', 'account', 'hours', 'location', 'delivery', 'welcome'];
            if (!fields.includes((field || '').toLowerCase())) return say(`Usage: .shopset <${fields.join('|')}> <value>\nUse "-" to clear a value.`);
            const value = v.join(' ').trim();
            s.settings[field.toLowerCase()] = value === '-' ? '' : value;
            store.save();
            return say(`✅ ${field} set to: ${value === '-' ? '(empty)' : value}`);
        }
        case '.addproduct': {
            const [name, price, stock, category, desc] = args.split('|').map(x => (x || '').trim());
            const p = Number(String(price).replace(/[^\d.]/g, ''));
            if (!name || !(p > 0)) return say('Usage: .addproduct Name | price | stock | category | description\nExample: .addproduct Infinix Hot 40 | 17500 | 5 | Phones | 8GB RAM, 256GB');
            const product = { code: store.nextProductCode(), name, price: p, stock: Math.max(0, Number(stock) || 0), category: category || 'Other', desc: desc || '' };
            s.products.push(product); store.save();
            return say(`✅ Added *${product.code}* ${product.name}: ${kes(product.price)}, ${product.stock} in stock.`);
        }
        case '.editproduct': {
            const [code, field, ...v] = args.split(/\s+/);
            const p = store.findProduct(code);
            const value = v.join(' ');
            if (!p || !['name', 'price', 'stock', 'category', 'desc'].includes((field || '').toLowerCase()) || !value) {
                return say('Usage: .editproduct P3 <name|price|stock|category|desc> <value>');
            }
            const f = field.toLowerCase();
            if (f === 'price' || f === 'stock') {
                const n = Number(value.replace(/[^\d.]/g, ''));
                if (!(n >= 0) || (f === 'price' && n === 0)) return say('Please give a valid number.');
                p[f] = n;
            } else p[f] = value;
            store.save();
            return say(`✅ ${p.code} updated: ${f} = ${f === 'price' ? kes(p.price) : p[f]}`);
        }
        case '.stock': {
            const p = store.findProduct(rest[0]);
            const n = Number(rest[1]);
            if (!p || !(n >= 0)) return say('Usage: .stock P3 10');
            p.stock = n; store.save();
            return say(`✅ ${p.code} ${p.name}: ${n} in stock.`);
        }
        case '.delproduct': {
            const p = store.findProduct(args);
            if (!p) return say('Usage: .delproduct P3');
            s.products = s.products.filter(x => x !== p); store.save();
            return say(`🗑️ Removed ${p.code} ${p.name}.`);
        }
        case '.items':
            return say(s.products.length ? '*Products*\n' + s.products.map(p => `${p.code} ${p.name}: ${kes(p.price)} · stock ${p.stock}`).join('\n') : 'No products. Add one with .addproduct');
        case '.addfaq': {
            const [words, answer] = args.split('|').map(x => (x || '').trim());
            const keywords = (words || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
            if (!keywords.length || !answer) return say('Usage: .addfaq word1, word2 | answer\nExample: .addfaq pick up, collect | You can pick up from our shop on Moi Avenue.');
            s.faqs.push({ keywords, answer }); store.save();
            return say(`✅ FAQ ${s.faqs.length} added. Customers who mention "${keywords.join('" or "')}" get that answer.`);
        }
        case '.faqs':
            return say(s.faqs.length ? '*FAQs*\n' + s.faqs.map((f, i) => `${i + 1}. [${f.keywords.join(', ')}] ${f.answer}`).join('\n') : 'No FAQs yet.');
        case '.delfaq': {
            const i = Number(args) - 1;
            if (!s.faqs[i]) return say('Usage: .delfaq <number> (see .faqs)');
            s.faqs.splice(i, 1); store.save();
            return say('🗑️ FAQ removed.');
        }
        case '.orders': {
            const which = args.toLowerCase();
            const list = s.orders.filter(o => which === 'all' ? true : which ? o.status === which || STATUS[o.status]?.toLowerCase().includes(which)
                : ['awaiting_payment', 'payment_submitted', 'paid'].includes(o.status)).slice(-15).reverse();
            if (!list.length) return say(which ? `No ${which} orders.` : 'No open orders 🎉');
            return say(`*${which ? which[0].toUpperCase() + which.slice(1) : 'Open'} orders*\n` +
                list.map(o => `*${o.id}* ${o.name}: ${kes(o.total)} · ${STATUS[o.status]}${o.mpesaCode ? ` · ${o.mpesaCode}` : ''}`).join('\n'));
        }
        case '.order': {
            const o = store.findOrder(args);
            if (!o) return say('Usage: .order ORD1001');
            return say(`*${o.id}* · ${STATUS[o.status]}\n👤 ${o.name} (${customerLabel(o.customer)})\n📍 ${o.location}\n` +
                o.items.map(i => `• ${i.qty} × ${i.name}: ${kes(i.price * i.qty)}`).join('\n') +
                `\nTotal: *${kes(o.total)}*${o.mpesaCode ? `\nM-Pesa: ${o.mpesaCode}` : ''}\nPlaced: ${o.createdAt.slice(0, 16).replace('T', ' ')}`);
        }
        case '.paid':
        case '.delivered':
        case '.cancelorder': {
            const o = store.findOrder(args);
            if (!o) return say(`Usage: ${cmd} ORD1001`);
            const status = { '.paid': 'paid', '.delivered': 'delivered', '.cancelorder': 'cancelled' }[cmd];
            if (o.status === status) return say(`${o.id} is already ${STATUS[status]}.`);
            store.setOrderStatus(o, status);
            const msg = {
                paid: `✅ Payment received for order *${o.id}* (${kes(o.total)}). Thank you! We're preparing your delivery to ${o.location}.`,
                delivered: `📦 Order *${o.id}* has been delivered. Thank you for shopping with *${s.settings.name}*! 🙏`,
                cancelled: `❌ Order *${o.id}* has been cancelled. Reply *7* if you have questions.`,
            }[status];
            try { await send(sock, o.customer, msg); } catch (e) { console.error('[shop] could not message customer:', e.message); }
            return say(`${STATUS[status]}: ${o.id}. Customer notified.`);
        }
        case '.reply': {
            const [ref, ...words] = args.split(/\s+/);
            const body = words.join(' ').trim();
            const order = store.findOrder(ref);
            const ticket = (s.tickets || []).find(t => t.id.toLowerCase() === String(ref).toLowerCase());
            const to = order ? order.customer : ticket ? ticket.jid : null;
            if (!to || !body) return say('Usage: .reply ORD1001 <message>  or  .reply T3 <message>');
            await send(sock, to, `💬 *${s.settings.name}*: ${body}`);
            return say('✅ Sent.');
        }
        default:
            return null;
    }
}

/**
 * Entry point from main.js. Returns true when the shop handled the message.
 * ctx: { chatId, senderId, isGroup, rawText, isOwnerOrSudo, fromMe }
 */
async function handleShopMessage(sock, message, ctx) {
    const text = String(ctx.rawText || '').trim();
    if (!text) return false;
    const first = text.split(/\s+/)[0].toLowerCase();
    if (ctx.isOwnerOrSudo && OWNER_CMDS.includes(first)) {
        const handled = await handleOwnerCommand(sock, message, ctx.chatId, text);
        return handled !== null;
    }
    const st = store.shop().settings;
    // Customers: private chats only, not the bot's own messages, not the owner/sudo (they keep normal bot commands)
    if (!st.enabled || ctx.isGroup || ctx.fromMe || ctx.isOwnerOrSudo) return false;
    if (ctx.chatId === 'status@broadcast' || ctx.chatId.endsWith('@newsletter') || ctx.chatId.endsWith('@broadcast')) return false;
    await handleCustomer(sock, message, ctx.chatId, text);
    return true;
}

module.exports = { handleShopMessage, handleCustomer, handleOwnerCommand, menuText, productsText, OWNER_CMDS };
