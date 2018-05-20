# pg-reactive

![build status](https://travis-ci.org/haoliangyu/pg-reactive.svg?branch=master)

[![ReactiveX](http://reactivex.io/assets/Rx_Logo_S.png)](http://reactivex.io/)

[RxJS](http://reactivex.io/) interface for PostgreSQL in node.js


## Installation


``` bash
npm install pg-reactive
```

## Example

``` javascript
import pgrx from 'pg-reactive';

let db = new pgrx('postgres://postgres@$localhost/tester');

db.query('SELECT id FROM user')
  .map((row) => row.id)
  .subscribe((id) => {
    console.log('ID: ', id);
  });
```

## Documentation

* `pgrx` Class

  Database connection class. It can be initialized with a database url like

  ```
  pg://user:password@host:port/database
  ```

  or a crednetial object:

  ``` json
  {
    "user": "postgres",
    "database": "tester",
    "password": "",
    "host": "localhost",
    "port": 5432
  }
  ```

* `pgrx.end()` Function

  End the current database connection.

* `pgrx.query(sql[, values])` Function

  Run a query with optional values. This function supports the query formating of [pg](https://github.com/brianc/node-postgres/wiki/Client#parameterized-queries) and you can construct the query like

  ``` javascript
  pgrx.query('SELECT id FROM user WHERE name = $1::text', ['Tom']);
  ```

  It will return an observable that emits every row of the query result.

* `pgrx.tx(callback)` Function

  Run queries within a transaction. The callback function receives an object that has a `query()` function to run queries within the transaction and return an observable. To pass the data to the following operator, return an observable in the callback function.

  ``` javascript
  pgrx.tx((t) => {
    let insert1 = t.query('INSERT INTO user (name) VALUES ($1::text) RETURNING id;', ['Tom']);
    let insert2 = t.query('INSERT INTO user (name) VALUES ($1::text) RETURNING id;', ['Joe']);

    return insert1.concat(insert2);
  })
  .subscribe((row) => console.log(row));
  ```

  No data will be emitted if any query in a transaction fails.

## TypeScript

`pg-reactive` is shipped with its type declaration file and it can be used in a TypeScript directly.

## How it works?

Before using this library or reading its source code, you should know [Reactive Programming & RxJS](http://reactivex.io/intro.html).

`pg-reactive` wraps the low-level [pg](https://github.com/haoliangyu/pg-reactive) APIs and exposes a RxJS-compatible interface. The work of `pg-reactive` includes the following three aspects.

### Deferred Query

Unlike [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) as the final state of an asynchronous action, [Observable](http://reactivex.io/documentation/observable.html) works as a data source of asynchronous actions. When providing a observable-based API, `pg-reactive` [cools down](https://stackoverflow.com/questions/32190445/hot-and-cold-observables-are-there-hot-and-cold-operators) the original `pg` functions by deferring their execution using [Rx.Observable.defer()](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#static-method-defer).

In this way, the data stream is controllable with `subscribe()` / `unsubscribe()` without worrying data leak. The data stream is generated using the `row`, `error`, `end` event of the [query](https://github.com/brianc/node-postgres/wiki/Client#events) object of `pg`, which ensures the query result is emitted by rows.

### Transaction as an Observable

The `tx()` function of `pg-reactive` accepts a callback function where the user is able to organization the data flow within a transaction, which may includes different database operations. The data flow behind this function is actually `query('BEGIN') -> query('Your Command') -> query('COMMIT')` and a `query('ROLLBACK')` will be executed in cause of any error.

Note that unlike the query observable, the tx observable doesn't emit data until the query is completely done. Therefore, the tx observable guarantees to emit nothing if error happens.

## License

MIT
