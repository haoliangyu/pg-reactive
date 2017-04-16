import { Observable } from 'rxjs';

export as namespace pgReactive;

interface pgConfig {
  host: string,
  port: number,
  database: string,
  user: string,
  password: string
}

interface pgrxOptions {
  pool?: boolean
}

interface transaction {
  query(sql: string, values?: Array<any>): Observable<any>;
}

export default class pgrx {
  constructor(config: string|pgConfig, options?: pgrxOptions);

  end(): void;

  query(sql: string, values?: Array<any>): Observable<any>;

  tx(fn: (tx: transaction) => Observable<any>): Observable<any>;
}
