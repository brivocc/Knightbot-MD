/**
 * Shop data (added by Bevon Manyara): products, FAQs, orders, carts and shop settings,
 * kept in data/shop.json. Writes go to a temp file first so a crash can't corrupt it.
 */
const fs = require('fs');
const path = require('path');

const FILE = process.env.SHOP_DATA_FILE || path.join(__dirname, '..', '..', 'data', 'shop.json');

function defaults() {
    return {
        settings: {
            enabled: true,
            ai: true,
            name: process.env.SHOP_NAME || 'My Shop',
            till: process.env.MPESA_TILL || '',
            paybill: process.env.MPESA_PAYBILL || '',
            account: process.env.MPESA_ACCOUNT || '', // empty = customer uses the order number as the account
            hours: 'Mon–Sat 8:00 AM – 7:00 PM',
            location: 'Nairobi CBD (set yours with .shopset location ...)',
            delivery: 'Nairobi: KES 200, same day for orders before 3 PM. Countrywide via courier: KES 400, 1–2 days.',
            welcome: '',
        },
        // Sample products so the bot works out of the box. Replace with .addproduct / .delproduct.
        products: [
            { code: 'P1', name: 'Samsung Galaxy A15 (128GB)', price: 18500, stock: 6, category: 'Phones', desc: '6.5" screen, 50MP camera, 5000mAh battery, 1-year warranty.' },
            { code: 'P2', name: 'Tecno Spark 20 (128GB)', price: 14500, stock: 8, category: 'Phones', desc: '6.6" screen, 50MP camera, fast charging.' },
            { code: 'P3', name: 'Oraimo 20,000mAh power bank', price: 2800, stock: 15, category: 'Accessories', desc: 'Charges a phone 4–5 times, two USB ports.' },
            { code: 'P4', name: 'Oraimo FreePods (wireless earbuds)', price: 2500, stock: 12, category: 'Accessories', desc: 'Bluetooth 5.3, up to 30 hours with case.' },
            { code: 'P5', name: 'Fast charger 33W (Type-C)', price: 1200, stock: 20, category: 'Accessories', desc: 'Charger head and Type-C cable.' },
            { code: 'P6', name: '32" Smart TV (Android)', price: 21000, stock: 3, category: 'Electronics', desc: 'HD, Netflix and YouTube, 2 HDMI ports, 1-year warranty.' },
            { code: 'P7', name: 'Electric kettle 1.8L', price: 1500, stock: 10, category: 'Home', desc: 'Stainless steel, auto switch-off.' },
            { code: 'P8', name: 'Non-stick cooking pot set (5 pcs)', price: 3900, stock: 5, category: 'Home', desc: 'With glass lids, gas and electric cookers.' },
        ],
        faqs: [
            { keywords: ['original', 'genuine', 'fake', 'warranty'], answer: 'All our products are genuine and new. Phones and TVs come with a 1-year warranty; accessories 6 months.' },
            { keywords: ['return', 'refund', 'exchange'], answer: 'You can return an item within 7 days if it is faulty, with the receipt and original box. We repair or replace it.' },
            { keywords: ['lipa mdogo', 'installment', 'instalment', 'credit', 'lipa pole'], answer: 'We currently accept full payment only (M-Pesa). Ask a person (reply 7) about deposits for big items.' },
        ],
        orders: [],
        carts: {},     // jid -> { items: [{code, qty}], stage, name, location }
        nextOrder: 1001,
    };
}

let cache = null;

function load() {
    if (cache) return cache;
    try {
        cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
        const d = defaults();
        cache.settings = { ...d.settings, ...(cache.settings || {}) };
        for (const key of ['products', 'faqs', 'orders']) if (!Array.isArray(cache[key])) cache[key] = d[key];
        cache.carts = cache.carts || {};
        cache.nextOrder = cache.nextOrder || 1001;
    } catch {
        cache = defaults();
        save();
    }
    return cache;
}

function save() {
    if (!cache) return;
    const tmp = FILE + '.tmp';
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
    fs.renameSync(tmp, FILE);
}

/** For tests: start from a given data object (or fresh defaults) without touching the disk file. */
function _reset(data) { cache = data || defaults(); }

const shop = () => load();

function findProduct(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return null;
    const code = q.replace(/^p?(\d+)$/, 'p$1');
    return shop().products.find(p => p.code.toLowerCase() === code)
        || shop().products.find(p => p.name.toLowerCase() === q) || null;
}

function nextProductCode() {
    const nums = shop().products.map(p => Number(String(p.code).replace(/\D/g, '')) || 0);
    return 'P' + (Math.max(0, ...nums) + 1);
}

function cart(jid) {
    const c = shop().carts[jid] || (shop().carts[jid] = { items: [] });
    c.items = c.items || [];
    return c;
}

function cartLines(jid) {
    return cart(jid).items.map(i => ({ ...i, product: findProduct(i.code) })).filter(i => i.product);
}

function cartTotal(jid) {
    return cartLines(jid).reduce((sum, i) => sum + i.product.price * i.qty, 0);
}

function createOrder(jid, { name, location }) {
    const lines = cartLines(jid);
    if (!lines.length) return null;
    const s = shop();
    const order = {
        id: 'ORD' + s.nextOrder++,
        customer: jid,
        name, location,
        items: lines.map(l => ({ code: l.product.code, name: l.product.name, price: l.product.price, qty: l.qty })),
        total: lines.reduce((sum, l) => sum + l.product.price * l.qty, 0),
        status: 'awaiting_payment',
        mpesaCode: '',
        createdAt: new Date().toISOString(),
    };
    for (const l of lines) l.product.stock = Math.max(0, (l.product.stock || 0) - l.qty);
    s.orders.push(order);
    delete s.carts[jid];
    save();
    return order;
}

function findOrder(id) {
    const q = String(id || '').trim().toUpperCase().replace(/^(\d+)$/, 'ORD$1');
    return shop().orders.find(o => o.id === q) || null;
}

function setOrderStatus(order, status) {
    if (status === 'cancelled' && order.status !== 'cancelled') {
        for (const item of order.items) { const p = findProduct(item.code); if (p) p.stock += item.qty; }
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    save();
}

module.exports = { shop, save, findProduct, nextProductCode, cart, cartLines, cartTotal, createOrder, findOrder, setOrderStatus, _reset, FILE };
