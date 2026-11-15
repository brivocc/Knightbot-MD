// Tests for the features added by Bevon Manyara. Run with: npm test   (no WhatsApp needed)
const test = require('node:test');
const assert = require('node:assert');
const { normalizeNumber, toJid, findNumberInText, jidNumber } = require('../lib/phone');
const k = require('../commands/kenya');

test('phone numbers in any format become international digits', () => {
    for (const raw of ['0712345678', '0712 345 678', '+254712345678', '254712345678', '712345678', '+254 712-345-678', '00254712345678',
        '254712345678@s.whatsapp.net', '254712345678:12@s.whatsapp.net']) {
        assert.strictEqual(normalizeNumber(raw), '254712345678', raw);
    }
    assert.strictEqual(normalizeNumber('0112345678'), '254112345678');
    assert.strictEqual(normalizeNumber('+447911123456'), '447911123456');
    assert.strictEqual(normalizeNumber('917023951514'), '917023951514');
    assert.strictEqual(normalizeNumber('12'), '');
    assert.strictEqual(normalizeNumber('hello'), '');
    assert.strictEqual(normalizeNumber(''), '');
    assert.strictEqual(toJid('0712 345 678'), '254712345678@s.whatsapp.net');
    assert.strictEqual(jidNumber('254712345678:3@s.whatsapp.net'), '254712345678');
});

test('numbers are found inside command text', () => {
    assert.strictEqual(findNumberInText('.sudo add 0712 345 678'), '254712345678');
    assert.strictEqual(findNumberInText('.sudo del +254 712 345 678'), '254712345678');
    assert.strictEqual(findNumberInText('.sudo add'), '');
});

test('Easter and Kenyan holidays', () => {
    assert.strictEqual(k.easterSunday(2026).toISOString().slice(0, 10), '2026-04-05');
    assert.strictEqual(k.easterSunday(2027).toISOString().slice(0, 10), '2027-03-28');
    const h = k.kenyanHolidays(2027);
    const byName = Object.fromEntries(h.map(x => [x.name, x.date.toISOString().slice(0, 10)]));
    assert.strictEqual(byName['Good Friday'], '2027-03-26');
    assert.strictEqual(byName['Easter Monday'], '2027-03-29');
    assert.strictEqual(byName['Madaraka Day'], '2027-06-01');
    assert.strictEqual(byName['Jamhuri Day'], '2027-12-12');
    assert.ok(h.find(x => x.name === 'Jamhuri Day').sunday, '12 Dec 2027 is a Sunday');
    assert.deepStrictEqual(h.map(x => x.date), [...h.map(x => x.date)].sort((a, b) => a - b), 'sorted by date');
    const text = k.formatHolidays(2027, new Date(2027, 4, 2));
    assert.match(text, /Next: \*Madaraka Day\* in 30 day/);
});

test('counties by name or number', () => {
    assert.strictEqual(k.COUNTIES.length, 47);
    assert.deepStrictEqual(k.findCounty('47'), { code: 47, name: 'Nairobi', hq: 'Nairobi' });
    assert.strictEqual(k.findCounty('nakuru').code, 32);
    assert.strictEqual(k.findCounty('uasin gishu').hq, 'Eldoret');
    assert.strictEqual(k.findCounty('muranga').name, "Murang'a");
    assert.strictEqual(k.findCounty('taita taveta').code, 6);
    assert.strictEqual(k.findCounty('48'), null);
    assert.strictEqual(k.findCounty('atlantis'), null);
});

test('currency command parsing', () => {
    assert.deepStrictEqual(k.parseKes('100 usd'), { amount: 100, from: 'USD', to: 'KES' });
    assert.deepStrictEqual(k.parseKes('5,000 to eur'), { amount: 5000, from: 'KES', to: 'EUR' });
    assert.strictEqual(k.parseKes('abc usd'), null);
    assert.strictEqual(k.parseKes('100'), null);
    assert.strictEqual(k.parseKes('-5 usd'), null);
});

test('sheng words', () => {
    assert.ok(k.SHENG.sasa && k.SHENG.mathree && k.SHENG.keja);
});
