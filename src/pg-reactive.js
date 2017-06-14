import { Observable } from 'rxjs';
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
   * @return {Observable}            Observable
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
      return Observable
        .defer(() => Observable.fromPromise(this._db.connect()))
        .concatMap((client) => {
          return this._streamQuery(client.query.bind(client), sql, values, client.release.bind(client));
        });
    }
  }

  /**
   * Run database operations using a transaction.
   * @param  {Function} fn      A function that returns an observable for database operation.
   * @return {Observable}       Observable
   */
  tx(fn) {

    if (typeof fn !== 'function') {
      throw new Error('Expect the input to be Function, but get ' + typeof fn);
    }

    if (this._type === 'pool') {
      return Observable.defer(() => Observable.fromPromise(this._db.connect()))
      .concatMap((client) => {
        let observable = fn({
          query: (sql, values) => this._deferQuery(client.query.bind(client), sql, values)
        });

        if (!isObservable(observable)) {
          return Observable.throw(new Error('Expect the function to return Observable, but get ' + typeof observable));
        }

        let queryFn = client.query.bind(client);

        return Observable.concat(
          this._deferQuery(queryFn, 'BEGIN;'),
          observable,
          this._deferQuery(queryFn, 'COMMIT;')
        )
        .toArray()
        .mergeMap((results) => Observable.of(...results))
        .catch((err) => {
          let query = queryFn('ROLLBACK;');

          return Observable.create((observer) => {
            query.on('end', () => observer.error(err));
          });
        })
        .finally(() => client.release());
      });
    } else {
      let observable = fn({
        query: this.query.bind(this)
      });

      if (!isObservable(observable)) {
        return Observable.throw(new Error('Expect the function to return Observable, but get ' + typeof observable));
      }

      return Observable.concat(this.query('BEGIN'), observable, this.query('COMMIT'))
        .toArray()
        .mergeMap((results) => Observable.of(...results))
        .catch((err) => {
          let query = this._db.query('ROLLBACK;');

          return Observable.create((observer) => {
            query.on('end', () => observer.error(err));
          });
        });
    }
  }

  _streamQuery(queryFn, sql, values, cleanup) {
    return Observable.create((observer) => {
      let query = queryFn(sql, values);

      query.on('row', (row) => observer.next(row));
      query.on('error', (error) => observer.error(error));
      query.on('end', () => observer.complete());

      return cleanup;
    });
  }

  _deferQuery(queryFn, sql, values, cleanup) {
    return Observable.defer(() => this._streamQuery(queryFn, sql, values, cleanup));
  }
}
