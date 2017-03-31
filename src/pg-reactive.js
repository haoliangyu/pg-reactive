import Rx from 'rxjs';
import pg from 'pg';
import url from 'url';
import isObservable from 'is-observable';

export default class pgrx {

  /**
   * Initalize a database connection.
   * @param  {String|Object} config    PostgreSQL database connection string or config object
   * @param  {Object}        [options] Connection options
   */
  constructor(config, options) {
    options = options || {};

    if (options.pool === false) {
      this._db = new pg.Client(config);
      this._type = 'client';
      this._db.connect();
    } else {
      if (typeof config === 'string') {
        let params = url.parse(config);
        let auth = params.auth.split(':');

        config = {
          user: auth[0],
          password: auth[1],
          host: params.hostname,
          port: params.port,
          database: params.pathname.split('/')[1]
        };
      }

      this._db = new pg.Pool(config);
      this._type = 'pool';
    }
  }

  /**
   * Close the current database connection.
   * @return {Undefined}  No return
   */
  end() {
    this._db.end();
  }

  /**
   * Perform quary with optional parameters
   * @param  {String}         sql       Query SQL
   * @param  {Array}          [values]  Optional query parameters
   * @return {Rx.Observable}            Rx.Observable
   */
  query(sql, values) {

    if (!sql || typeof sql !== 'string') {
      throw new Error('Invalid queary: ' + sql);
    }

    if (values) {
      values = Array.isArray(values) ? values : [values];
    }

    if (this._type === 'client') {
      return this._queryToObservable(this._db.query.bind(this._db), sql, values);
    } else {
      return Rx.Observable.fromPromise(this._db.connect())
        .mergeMap((client) => {
          let query = client.query(sql, values);

          return Rx.Observable.create((observer) => {
            query.on('row', (row) => { observer.next(row); });
            query.on('error', (error) => {
              client.release();
              observer.error(error);
            });
            query.on('end', () => {
              client.release();
              observer.complete();
            });
          });
        });
    }
  }

  /**
   * Run database operations using a transaction.
   * @param  {Function} fn      A function that returns a observable for database operation.
   * @return {Rx.Observable}    Rx.Observable
   */
  transaction(fn) {

    if (typeof fn !== 'function') {
      throw new Error('Expect the input to be Function, but get ' + typeof fn);
    }

    if (this._type === 'pool') {
      return Rx.Observable.fromPromise(this._db.connect())
        .mergeMap((client) => {
          let observable = fn(this._poolClientWrapper(client));

          if (!isObservable(observable)) {
            return Rx.Observable.throw(new Error('Expect the function to return Observable, but get ' + typeof observable));
          }

          let queryFn = client.query.bind(client);

          return Rx.Observable.merge([
            this._queryToObservable(queryFn, 'BEGIN;'),
            observable,
            this._queryToObservable(queryFn, 'COMMIT;'),
            Rx.Observable.create((observer) => {
              client.release();
              observer.complete();
            })
          ])
          .skip(1)
          .skipLast(2)
          .catch((err) => {
            return this._queryToObservable(queryFn, 'ROLLBACK;')
              .mergeMap(() => {
                client.release();
                return Rx.Observable.throw(err);
              });
          });
        });
    } else {
      let observable = fn(this);

      if (!isObservable(observable)) {
        return Rx.Observable.throw(new Error('Expect the function to return Observable, but get ' + typeof observable));
      }

      return Rx.Observable.merge([
        this.query('BEGIN;'),
        observable,
        this.query('COMMIT;')
      ], 1)
      .skip(1)
      .skipLast(1)
      .catch((err) => this.query('ROLLBACK;').mergeMap(() => Rx.Observable.throw(err)));
    }
  }

  _queryToObservable(queryFn, sql, values) {
    let query = queryFn(sql, values);

    return Rx.Observable.create((observer) => {
      query.on('row', (row) => observer.next(row));
      query.on('error', (error) => observer.error(error));
      query.on('end', () => observer.complete());
    });
  }

  _poolClientWrapper(client) {
    return {
      query: (sql, values) => this._queryToObservable(client.query, sql, values)
    };
  }
}
