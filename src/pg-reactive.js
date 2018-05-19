import { Observable } from 'rxjs';
import pg from 'pg';
import QueryStream from 'pg-query-stream';
import url from 'url';
import isObservable from 'is-observable';

export default class pgrx {

  /**
   * Initalize a database connection.
   * @param  {String|Object} config    PostgreSQL database connection string or config object
   */
  constructor(config) {

    if (typeof config === 'string') {
      const params = url.parse(config);
      const auth = params.auth ? params.auth.split(':') : [];

      config = {
        user: auth[0],
        password: auth[1],
        host: params.hostname,
        port: params.port,
        database: params.pathname.split('/')[1]
      };
    }

    this._db = new pg.Pool(config);
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

    return Observable
      .defer(() => Observable.fromPromise(this._db.connect()))
      .concatMap((client) => {
        return this._streamQuery(client.query.bind(client), sql, values, client.release.bind(client));
      });
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

    return Observable.defer(() => Observable.fromPromise(this._db.connect()))
      .concatMap((client) => {
        let observable = fn({
          query: (sql, values) => this._deferQuery(client.query.bind(client), sql, values)
        });

        if (!isObservable(observable)) {
          return Observable.throw(new Error('Expect the function to return Observable, but get ' + typeof observable));
        }

        let queryFn = client.query.bind(client);
        let begin = this._deferQuery(queryFn, 'BEGIN;');
        let commit = this._deferQuery(queryFn, 'COMMIT;');

        return Observable.concat(begin, observable, commit)
          .toArray()
          .mergeMap((results) => Observable.of(...results))
          .catch((err) => {
            return Observable.defer(() => queryFn('ROLLBACK;').then(() => { throw err; }));
          })
          .finally(() => client.release());
      });
  }

  _streamQuery(queryFn, sql, values, cleanup) {
    return Observable.create((observer) => {
      let query = new QueryStream(sql, values);
      let stream = queryFn(query);

      stream.on('data', (row) => observer.next(row));
      stream.on('error', (error) => observer.error(error));
      stream.on('end', () => observer.complete());

      return cleanup;
    });
  }

  _deferQuery(queryFn, sql, values, cleanup) {
    return Observable.defer(() => this._streamQuery(queryFn, sql, values, cleanup));
  }
}

module.exports = pgrx;
