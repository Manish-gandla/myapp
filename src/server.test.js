const assert = require('assert');

// A trivial "test" so the CI pipeline has something real to run.
// Replace with actual tests (jest/mocha) as your app grows.
function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    throw err;
  }
}

test('sanity check - math works', () => {
  assert.strictEqual(1 + 1, 2);
});

test('env default is set', () => {
  const port = process.env.PORT || 3000;
  assert.ok(port);
});

console.log('All tests passed.');
