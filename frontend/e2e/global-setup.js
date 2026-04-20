const path = require('node:path');
const { execFileSync } = require('node:child_process');

module.exports = async () => {
  execFileSync('node', ['scripts/seed-browser-e2e.js'], {
    cwd: path.resolve(__dirname, '../../backend'),
    stdio: 'inherit',
  });
};
