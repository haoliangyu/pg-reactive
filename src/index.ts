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
   * Run quary with optional parameters.
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
   * Run database operations using a transaction.
   * @param  fn A function that returns an observable for database operation.
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
