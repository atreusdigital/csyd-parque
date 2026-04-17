// Handler serverless para Vercel.
// Importa la app Express de server.js y la expone como función.
// Todas las rutas (estáticos de /public, /admin, /api/*) pasan por acá.
module.exports = require('../server');
