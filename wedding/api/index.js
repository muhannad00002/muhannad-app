/* Vercel serverless entry — routes all /api/* requests to the shared handler.
   The handler (wedding/server/server.js) lazily initializes the DB on first
   call, so it is safe across cold starts. */
module.exports = require("../server/server.js");
