const { registerAuthHandlers } = require('./authHandler');

function registerAuthIpc() {
  registerAuthHandlers();
}

module.exports = registerAuthIpc;
