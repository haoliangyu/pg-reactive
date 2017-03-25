import chai from 'chai';
import config from 'config';
import pgrx from '../src/pg-reactive';

let expect = chai.expect;
let test = config.get(process.env.NODE_ENV === 'travis' ? 'travis-test' : 'test');
let url = `postgres://${test.user}:${test.password}@${test.host}:${test.port}/${test.database}`;
let db;

describe('pg-reactive client', () => {

  afterEach(() => {
    if (db) {
      db.end();
    }
  });

  it('should build connection with the test database.', () => {
    expect(() => new pgrx(url, { pool: false })).to.not.throw('successful initialization');
  });

  it('should run a query returning one row.', (done) => {
    db = new pgrx(url, { pool: false });

    db.query('SELECT 1 AS id')
      .subscribe(
        (row) => expect(row.id).to.equal(1),
        null,
        () => done()
      );
  });

  it('should run a query returning multiple rows', (done) => {
    let results = [];

    db = new pgrx(url, { pool: false });

    db.query('SELECT 1 AS id UNION ALL SELECT 2 AS id')
      .subscribe(
        (row) => results.push(row.id),
        null,
        () => {
          expect(results).to.have.lengthOf(2);
          expect(results).to.deep.equal([1, 2]);
          done();
        }
      );
  });

  it('should run a quer with parameters.', (done) => {
    let results = [];

    db = new pgrx(url, { pool: false });

    db.query('SELECT $1::integer AS id', [1])
      .subscribe(
        (row) => results.push(row.id),
        null,
        () => {
          expect(results).to.have.lengthOf(1);
          expect(results[0]).to.equal(1);
          done();
        }
      );
  });

  it('should catch the SQL error.', (done) => {
    db = new pgrx(url, { pool: false });

    db.query('SELECT id')
      .subscribe(
        () => {},
        (error) => {
          expect(error).to.be.an('error');
          done();
        }
      );
  });
});
