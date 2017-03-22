import chai from 'chai';
import config from 'config';
import pgrx from '../src/pg-reactive';

let expect = chai.expect;
let test = config.get('test');
let url = `postgres://${test.user}:${test.password}@${test.host}:${test.port}/${test.database}`;
let db;

describe('pg-reactive', () => {

  afterEach(() => {
    if (db) {
      db.end();
    }
  });

  it('should build connection with the test database.', () => {
    expect(() => new pgrx(url)).to.not.throw('successful initialization');
  });
});
