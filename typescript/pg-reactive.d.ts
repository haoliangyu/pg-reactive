/// <reference path="../node_modules/rxjs/Observable.d.ts" />

declare namespace pgReactive {

  class pgrx {
    constructor(config: string|Object, options?: Object);

    end();

    query(sql: string, values?: Array<any>): Observable;

    tx(fn: Function): Observable;
  }

}
