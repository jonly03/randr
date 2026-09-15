const { createApp } = require('./app');
const { createConfig } = require('./config');

const config = createConfig();
const app = createApp({ config });

app.listen(config.port, () => {
  process.stdout.write(`R&R server listening at http://localhost:${config.port}\n`);
});
