import { Pool } from "pg";
import * as config from "config";
import * as fs from "fs";
import * as path from "path";

const dbConfig = config.get(process.env.NODE_ENV === 'travis' ? 'travis-test' : 'test');
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
const pool = new Pool(dbConfig);

pool.query(schema)
  .then(() => {
    console.log('Test database is setup.');
    process.exit();
  })
  .catch((err) => {
    console.error('error running query', err);
    process.exit();
  });
