import Rx from 'rxjs';
import pg from 'pg';

export default class pgrx {

  /**
   * Initalize a database connection.
   * @param  {String} config    PostgreSQL database connection string
   */
  constructor(config) {
    this._client = new pg.Client(config);
    this._client.connect();
  }

  /**
   * Close the current database connection.
   * @return null
   */
  end() {
    this._client.end();
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

    let query = this._client.query(sql, values);

    return Rx.Observable.create((observer) => {
      query.on('row', (row) => { observer.next(row); });
      query.on('error', (error) => { observer.error(error); });
      query.on('end', () => { observer.complete(); });
    });
  }
}
