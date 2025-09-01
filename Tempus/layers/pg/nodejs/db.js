const fs = require('fs');
const { Pool } = require('pg');

let pool; // singleton instance

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT),
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(__dirname + '/rds-combined-ca-bundle.pem').toString()
      },
      max: 5,          // limit connections per Lambda instance
      idleTimeoutMillis: 30000, // close idle clients after 30s
    });
    console.log('New pool created');
  }
  return pool;
}

module.exports = { getPool };
