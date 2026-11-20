// Prints the integrity hashes used by Lab 2. Run from the project folder:  node tools/print-hash.js
// If you edit lib/booking-lib.js, paste the "2.4.1" line into PINNED_INTEGRITY in js/lab2.js.
global.window = global;
global.document = { readyState: 'complete', addEventListener() {}, body: { insertBefore() {}, appendChild() {}, setAttribute() {} }, createElement() { return { appendChild() {}, addEventListener() {}, style: {} }; }, getElementById() { return null; } };
global.localStorage = { getItem() { return null; }, setItem() {} };
global.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
require('../js/common.js');
require('../lib/booking-lib.js');
require('../lib/booking-lib.tampered.js');
for (const [key, factory] of Object.entries(WanderlyRegistry.factories)) {
  console.log(key.padEnd(16), Sentra.sriOf(factory.toString().replace(/\s+/g, '')));
}
