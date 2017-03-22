import Rx from 'rxjs';
import pg from 'pg';

export default class pgrx {

  /**
   * Create a database connection.
   * @param  {String} config    PostgreSQL database connection string
   */
  constructor(config) {
    this._client = new pg.Client(config);
    this._client.connect();
  }
}
