import { expect } from 'chai';
import { concat } from 'rxjs';
import * as config from 'config';

import pgrx from '../src/index';

const test: any = config.get(process.env.NODE_ENV === 'travis' ? 'travis-test' : 'test');
let db;

describe('pg-reactive pool', () => {

  afterEach(() => {
    if (db) {
      db.end();
    }
  });

  it('should connect to the test database with a URL.', () => {
    const url = `postgres://${test.user}:${test.password}@${test.host}:${test.port}/${test.database}`;
    const pg = new pgrx(url);

    expect(pg).to.be.an('object');
  });

  it('should connect to the test database with a URL with no credential.', () => {
    const url = `postgres://${test.host}:${test.port}/${test.database}`;
    const pg = new pgrx(url);

    expect(pg).to.be.an('object');
  });

  it('should run a query returning one row.', (done) => {
    const url = `postgres://${test.user}:${test.password}@${test.host}:${test.port}/${test.database}`;
    db = new pgrx(url);

    db.query('SELECT 1 AS id')
      .subscribe(
        (row) => expect(row.id).to.equal(1),
        null,
        () => done()
      );
  });

  it('should run a query returning multiple rows', (done) => {
    const url = `postgres://${test.user}:${test.password}@${test.host}:${test.port}/${test.database}`;
    const results = [];

    db = new pgrx(url);

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
    const url = `postgres://${test.user}:${test.password}@${test.host}:${test.port}/${test.database}`;
    const results = [];

    db = new pgrx(url);

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
    const url = `postgres://${test.user}:${test.password}@${test.host}:${test.port}/${test.database}`;
    db = new pgrx(url);

    db.query('SELECT id')
      .subscribe(
        // tslint:disable-next-line
        () => {},
        (error) => {
          expect(error).to.be.an('error');
          done();
        }
      );
  });

  it('should run queries within a transaction.', (done) => {
    const url = `postgres://${test.user}:${test.password}@${test.host}:${test.port}/${test.database}`;
    db = new pgrx(url);

    const results = [];

    db.tx((t) => t.query('SELECT 1 AS id'))
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

  it('should fail within a transaction and no data is left/returned.', (done) => {
    const url = `postgres://${test.user}:${test.password}@${test.host}:${test.port}/${test.database}`;
    db = new pgrx(url);

    const results = [];

    db
      .tx((t) => {
        const insert = t.query('INSERT INTO test (name) VALUES (\'failed\') RETURNING id;');
        const error = t.query('SELEC 1 AS id');

        return concat(insert, error);
      })
      .subscribe(
        (row) => results.push(row.id),
        (err) => {
          expect(err).to.be.an('error');
          expect(err.message).to.equal('syntax error at or near "SELEC"');
          expect(results).to.have.lengthOf(0);
          done();
        }
      );
  });
});
