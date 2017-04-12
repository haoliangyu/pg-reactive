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
      this._db.connect();
      this._type = 'client';
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
      return this._deferQuery(this._db.query.bind(this._db), sql, values);
    } else {
      return Rx.Observable.defer(() => Rx.Observable.fromPromise(this._db.connect()))
      .concatMap((client) => {
        return this._deferQuery(client.query.bind(client), sql, values, client.release.bind(client));
      });
    }
  }

  /**
   * Run database operations using a transaction.
   * @param  {Function} fn      A function that returns an observable for database operation.
   * @return {Rx.Observable}    Rx.Observable
   */
  tx(fn) {

    if (typeof fn !== 'function') {
      throw new Error('Expect the input to be Function, but get ' + typeof fn);
    }

    if (this._type === 'pool') {
      return Rx.Observable.defer(() => Rx.Observable.fromPromise(this._db.connect()))
      .concatMap((client) => {
        let observable = fn({
          query: (sql, values) => this._deferQuery(client.query.bind(client), sql, values)
        });

        if (!isObservable(observable)) {
          return Rx.Observable.throw(new Error('Expect the function to return Observable, but get ' + typeof observable));
        }

        let queryFn = client.query.bind(client);

        return Rx.Observable.concat(
          this._deferQuery(queryFn, 'BEGIN;'),
          observable,
          this._deferQuery(queryFn, 'COMMIT;'),
          Rx.Observable.create((observer) => {
            client.release();
            observer.complete();
          })
        )
        .toArray()
        .mergeMap((results) => Rx.Observable.of(...results))
        .catch((err) => {
          let query = queryFn('ROLLBACK;');

          return Rx.Observable.create((observer) => {
            query.on('end', () => {
              client.release();
              observer.error(err);
            });
          });
        });
      });
    } else {
      let observable = fn({
        query: this.query.bind(this)
      });

      if (!isObservable(observable)) {
        return Rx.Observable.throw(new Error('Expect the function to return Observable, but get ' + typeof observable));
      }

      return Rx.Observable.concat(this.query('BEGIN'), observable, this.query('COMMIT'))
        .toArray()
        .mergeMap((results) => Rx.Observable.of(...results))
        .catch((err) => {
          let query = this._db.query('ROLLBACK;');

          return Rx.Observable.create((observer) => {
            query.on('end', () => observer.error(err));
          });
        });
    }
  }

  _deferQuery(queryFn, sql, values, cleanup) {
    return Rx.Observable.defer(() => {
      let query = queryFn(sql, values);

      return Rx.Observable.create((observer) => {
        query.on('row', (row) => observer.next(row));
        query.on('error', (error) => observer.error(error));
        query.on('end', () => observer.complete());

        return cleanup;
      });
    });
  }
}
