import { Observable, defer, from, concat, of } from "rxjs";
import { concatMap, toArray, catchError, finalize } from "rxjs/operators";
import { Pool, PoolClient, ConnectionConfig } from "pg";
import QueryStream = require("pg-query-stream");
import * as url from "url";

export interface ITxClient {
  query: (sql: string, values?: any[]) => Observable<any>;
}

export default class PgRx {
  private _db: Pool;

  /**
   * Initalize a database connection.
   *
   * It can be initialized with a database url like
   * ```
   * pg://user:password@host:port/database
   * ```
   *
   * or a crednetial object:
   *
   * ``` json
   * {
   *   "user": "postgres",
   *   "database": "tester",
   *   "password": "",
   *   "host": "localhost",
   *   "port": 5432
   * }
   * ```
   *
   * @param config PostgreSQL database connection string or config object
   */
  constructor(config: string | ConnectionConfig) {
    let connectParams: ConnectionConfig;

    if (typeof config === "string") {
      const params = url.parse(config);
      const auth = params.auth ? params.auth.split(":") : [];

      connectParams = {
        user: auth[0],
        password: auth[1],
        host: params.hostname,
        port: parseInt(params.port, 10),
        database: params.pathname.split("/")[1]
      };
    } else {
      connectParams = config;
    }

    this._db = new Pool(connectParams);
  }

  /**
   * Close the current database connection.
   */
  public end(): void {
    this._db.end();
  }

  /**
   * Run a query with optional values.
   *
   * This function supports the query formatting of [pg](https://github.com/brianc/node-postgres/wiki/Client#parameterized-queries) and you can construct the query like
   *
   * ``` javascript
   * pgrx.query('SELECT id FROM user WHERE name = $1::text', ['Tom']);
   * ```
   *
   * It will return an observable that emits every row of the query result.
   *
   * @param  sql    Query SQL
   * @param  values Optional query parameters
   * @return        Observable
   */
  public query(sql: string, values?: any[]): Observable<any> {
    if (!sql || typeof sql !== "string") {
      throw new Error("Invalid queary: " + sql);
    }

    if (values) {
      values = Array.isArray(values) ? values : [values];
    }

    const observable = defer(() => this._db.connect());
    const doQuery = concatMap((client: PoolClient) => {
      const queryFn = client.query.bind(client);
      return this._streamQuery(
        queryFn,
        sql,
        values,
        client.release.bind(client)
      );
    });

    return observable.pipe(doQuery);
  }

  /**
   * Run queries within a transaction.
   *
   * The callback function receives an object that has a `query()` function to run queries within the transaction and return an observable. To pass the data to the following operator, return an observable in the callback function.
   *
   * ``` javascript
   * pgrx.tx((t) => {
   *  const insert1 = t.query('INSERT INTO user (name) VALUES ($1::text) RETURNING id;', ['Tom']);
   *  const insert2 = t.query('INSERT INTO user (name) VALUES ($1::text) RETURNING id;', ['Joe']);
   *
   *  return insert1.concat(insert2);
   * })
   * .subscribe((row) => console.log(row));
   * ```
   *
   * No data will be emitted if any query in a transaction fails.
   *
   * @param  fn A callback function that returns an observable for database operation.
   * @return    Observable
   */
  public tx(fn: (txClient: ITxClient) => Observable<any>): Observable<any> {
    const observable = defer(() => this._db.connect());
    const doQuery = concatMap((client: PoolClient) => {
      const queryFn = client.query.bind(client);
      const begin = defer(() => this._streamQuery(queryFn, "BEGIN;"));
      const commit = defer(() => this._streamQuery(queryFn, "COMMIT;"));
      const query = fn({
        query: (sql: string, values?: any[]) =>
          defer(() => this._streamQuery(queryFn, sql, values))
      });
      const expanseArray = concatMap((results: any[]) => of(...results));
      const handleError = catchError(err => {
        return defer(() =>
          queryFn("ROLLBACK;").then(() => {
            throw err;
          })
        );
      });
      const release = finalize(() => client.release());

      const execution = concat(begin, query, commit);

      return execution.pipe(
        toArray(),
        expanseArray,
        handleError,
        release
      );
    });

    return observable.pipe(doQuery);
  }

  private _streamQuery(
    queryFn: any,
    sql: string,
    values?: any[],
    cleanup?: any
  ) {
    return Observable.create(observer => {
      const query = new QueryStream(sql, values);
      const stream = queryFn(query);

      stream.on("data", row => observer.next(row));
      stream.on("error", error => observer.error(error));
      stream.on("end", () => observer.complete());

      return cleanup;
    });
  }
}
