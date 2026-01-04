import { Pool } from "pg";
import * as fs from "fs-extra";
import * as path from "path";

const config = fs.readJSONSync(path.join(__dirname, '../../config/default.json'));
const dbConfig = config[process.env.CI === 'true' ? 'ci-test' : 'test'];

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
