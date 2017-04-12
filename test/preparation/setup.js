const Pool = require('pg').Pool;
const config = require('config');
const fs = require('fs');
const path = require('path');

let dbConfig = config.get(process.env.NODE_ENV === 'travis' ? 'travis-test' : 'test');
let schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
let pool = new Pool(dbConfig);

pool.query(schema)
  .then(() => {
    console.log('Test database is setup.');
    process.exit();
  })
  .catch((err) => {
    console.error('error running query', err);
    process.exit();
  });
