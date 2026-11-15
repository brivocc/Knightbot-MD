// Shop tests (Bevon Manyara). No WhatsApp and no real AI calls: a fake socket records what the bot sends.
const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.SHOP_DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shop-')), 'shop.json');
process.env.OWNER_NUMBER = '0712345678';
delete process.env.ANTHROPIC_API_KEY;

const test = require('node:test');
const assert = require('node:assert');
const store = require('../lib/shop/store');
const ai = require('../lib/shop/ai');
const shop = require('../commands/shop');

const OWNER = '254712345678@s.whatsapp.net';
const CUST = '254799000111@s.whatsapp.net';
const sent = [];
const sock = { sendMessage: async (jid, content) => { sent.push({ jid, text: content.text }); return {}; } };
const say = async (text, from = CUST, extra = {}) => {
    sent.length = 0;
    const handled = await shop.handleShopMessage(sock, { key: {} }, {
        chatId: from, senderId: from, isGroup: false, rawText: text, isOwnerOrSudo: from === OWNER, fromMe: false, ...extra,
    });
    return { handled, toCustomer: sent.filter(s => s.jid === from).map(s => s.text).join('\n'), toOwner: sent.filter(s => s.jid === OWNER).map(s => s.text).join('\n') };
};

test('menu, products, cart and checkout to a paid, delivered order', async () => {
    store._reset();
    let r = await say('Hi');
    assert.ok(r.handled && /Reply with a number/.test(r.toCustomer));
    r = await say('1');
    assert.match(r.toCustomer, /\*P1\* Samsung Galaxy A15/);
    assert.match(r.toCustomer, /KES 18,500/);
    r = await say('products accessories');
    assert.match(r.toCustomer, /Power bank|power bank/i);
    assert.doesNotMatch(r.toCustomer, /Samsung/);
    r = await say('add P3 2');
    assert.match(r.toCustomer, /Added \*Oraimo 20,000mAh power bank\*/);
    assert.match(r.toCustomer, /Total: KES 5,600/);
    r = await say('p4');
    assert.match(r.toCustomer, /Total: KES 8,100/);
    r = await say('remove p4');
    assert.match(r.toCustomer, /Total: KES 5,600/);
    r = await say('3');
    assert.match(r.toCustomer, /What name/);
    r = await say('Amina Wanjiru');
    assert.match(r.toCustomer, /Where should we deliver/);
    r = await say('Utawala, near Shell');
    assert.match(r.toCustomer, /Reply \*yes\*/);
    r = await say('yes');
    assert.match(r.toCustomer, /Order \*ORD1001\* placed/);
    assert.match(r.toOwner, /New order \*ORD1001\*/);
    assert.strictEqual(store.findProduct('P3').stock, 13, 'stock reduced');
    r = await say('paid qjk1a2b3c4');
    assert.match(r.toCustomer, /confirming payment \*QJK1A2B3C4\*/);
    assert.match(r.toOwner, /Payment submitted for \*ORD1001\*/);
    r = await say('4');
    assert.match(r.toCustomer, /ORD1001.*Payment being confirmed/);
    // owner confirms
    r = await say('.paid ORD1001', OWNER);
    assert.ok(sent.some(s => s.jid === CUST && /Payment received for order \*ORD1001\*/.test(s.text)), 'customer notified of payment');
    r = await say('.delivered 1001', OWNER);
    assert.ok(sent.some(s => s.jid === CUST && /has been delivered/.test(s.text)));
    assert.strictEqual(store.findOrder('ORD1001').status, 'delivered');
});

test('checkout can be cancelled and empty cart is handled', async () => {
    store._reset();
    let r = await say('3');
    assert.match(r.toCustomer, /cart is empty/);
    await say('add p1');
    await say('checkout');
    r = await say('cancel');
    assert.match(r.toCustomer, /Checkout cancelled/);
    r = await say('2');
    assert.match(r.toCustomer, /Samsung/);
});

test('out of stock and unknown products', async () => {
    store._reset();
    store.findProduct('P6').stock = 0;
    let r = await say('add p6');
    assert.match(r.toCustomer, /out of stock/);
    r = await say('add p99');
    assert.match(r.toCustomer, /couldn't find P99/);
});

test('payment instructions use Till / Paybill set by the owner', async () => {
    store._reset();
    let r = await say('.shopset till 123456', OWNER);
    assert.match(r.toOwner, /till set to: 123456/);
    await say('.shopset paybill 400200', OWNER);
    await say('add p5');
    await say('3'); await say('Brian'); await say('Kitengela'); r = await say('yes');
    assert.match(r.toCustomer, /Till number: \*123456\*/);
    assert.match(r.toCustomer, /Business no: \*400200\*/);
    assert.match(r.toCustomer, /Account: \*ORD1001\*/, 'order number used as account');
});

test('FAQ answers and handoff to a person', async () => {
    store._reset();
    let r = await say('is this phone original?');
    assert.match(r.toCustomer, /genuine/);
    r = await say('7');
    assert.match(r.toCustomer, /team member will reply/);
    assert.match(r.toOwner, /\*T1\*.*needs a person/);
    r = await say('.reply T1 Hello, how can I help?', OWNER);
    assert.ok(sent.some(s => s.jid === CUST && /Hello, how can I help\?/.test(s.text)));
});

test('owner manages products and FAQs from WhatsApp', async () => {
    store._reset();
    let r = await say('.addproduct Infinix Hot 40 | 17,500 | 5 | Phones | 8GB RAM', OWNER);
    assert.match(r.toOwner, /Added \*P9\* Infinix Hot 40: KES 17,500, 5 in stock/);
    r = await say('.editproduct P9 price 16999', OWNER);
    assert.strictEqual(store.findProduct('P9').price, 16999);
    r = await say('.stock P9 0', OWNER);
    assert.strictEqual(store.findProduct('P9').stock, 0);
    r = await say('.delproduct P8', OWNER);
    assert.strictEqual(store.findProduct('P8'), null);
    r = await say('.addfaq pick up, collect | Pick up from our shop on Moi Avenue.', OWNER);
    r = await say('can I pick up myself?');
    assert.match(r.toCustomer, /Moi Avenue/);
    r = await say('.shop off', OWNER);
    r = await say('hi');
    assert.strictEqual(r.handled, false, 'shop off: customers fall through to the normal bot');
});

test('customers cannot run owner commands; groups and owner chats are left to the normal bot', async () => {
    store._reset();
    let r = await say('.addproduct Free phone | 1 | 99');
    assert.strictEqual(store.shop().products.length, 8, 'customer could not add a product');
    r = await say('hi', '1203630@g.us', { isGroup: true });
    assert.strictEqual(r.handled, false);
    r = await say('hi', OWNER);
    assert.strictEqual(r.handled, false, 'owner keeps normal bot behaviour');
});

test('unknown messages show the menu when the AI is off', async () => {
    store._reset();
    const r = await say('do you deliver to Mombasa on Sunday?');
    assert.match(r.toCustomer, /didn't get that/);
    assert.strictEqual(ai.available(), false);
});

test('AI assistant prompt contains only shop facts and stays stable', () => {
    store._reset();
    const facts = ai.shopFacts();
    assert.match(facts, /P1 \| Samsung Galaxy A15 \(128GB\) \| KES 18,500 \| in stock/);
    assert.match(facts, /FAQ:/);
    assert.strictEqual(facts, ai.shopFacts(), 'deterministic (prompt cache friendly)');
    assert.match(ai.INSTRUCTIONS, /\[HANDOFF\]/);
});
