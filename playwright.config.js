const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:8094' },
  webServer: {
    command: 'python3 -m http.server 8094',
    url: 'http://localhost:8094',
    reuseExistingServer: !process.env.CI,
  },
});
