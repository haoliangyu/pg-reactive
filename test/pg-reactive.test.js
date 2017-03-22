import chai from 'chai';
import config from 'config';
import pgrx from '../src/pg-reactive';

let expect = chai.expect;
let test = config.get('test');
let url = `postgres://${test.user}:${test.password}@${test.host}:${test.port}/${test.database}`;

describe('pg-reactive', () => {

  it('should build connection with the test database.', () => {
    expect(() => new pgrx(url)).to.not.throw('successful initialization');
  });

  it('should run a query returning one row.', (done) => {
    let db = new pgrx(url);

    db.query('SELECT 1 AS id')
      .subscribe(
        (row) => expect(row.id).to.equal(1),
        () => {},
        () => done()
      );
  });

});
