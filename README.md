# pg-reactive

[![npm](https://img.shields.io/npm/v/pg-reactive.svg)](https://www.npmjs.com/package/pg-reactive) [![Build Status](https://travis-ci.org/haoliangyu/pg-reactive.svg?branch=master)](https://travis-ci.org/haoliangyu/pg-reactive)
[![ReactiveX](http://reactivex.io/assets/Rx_Logo_S.png)](http://reactivex.io/)

[RxJS](https://github.com/ReactiveX/rxjs) interface for PostgreSQL in node.js


## Installation

``` bash
npm install pg-reactive
```

If you are using RxJS v5, install a previous version:

``` bash
npm install pg-reactive@^0.3.5
```

## Example

``` javascript
import PgRx from 'pg-reactive';

const db = new PgRx('postgres://postgres@$localhost/tester');

db.query('SELECT id FROM user')
  .map((row) => row.id)
  .subscribe((id) => {
    console.log('ID: ', id);
  });
```

## Documentation

* [latest (for RxJS 6)](https://haoliangyu.github.io/pg-reactive)
* [v0.3.x (for RxJS 5)](https://github.com/haoliangyu/pg-reactive/blob/v0.3.5/README.md)

## TypeScript

`pg-reactive` is shipped with its type declaration file and it can be used in a TypeScript directly.

## How it works?

Before using this library or reading its source code, you should know [Reactive Programming & RxJS](http://reactivex.io/intro.html).

`pg-reactive` wraps the low-level [pg](https://github.com/brianc/node-postgres) APIs and exposes a RxJS-compatible interface. The work of `pg-reactive` includes the following three aspects.

### Deferred Query

Unlike [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) as the final state of an asynchronous action, [Observable](http://reactivex.io/documentation/observable.html) works as a data source of asynchronous actions. When providing a observable-based API, `pg-reactive` [cools down](https://stackoverflow.com/questions/32190445/hot-and-cold-observables-are-there-hot-and-cold-operators) the original `pg` functions by deferring their execution using [Rx.Observable.defer()](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#static-method-defer).

In this way, the data stream is controllable with `subscribe()` / `unsubscribe()` without worrying data leak. The data stream is generated using the `row`, `error`, `end` event of the [query](https://github.com/brianc/node-postgres/wiki/Client#events) object of `pg`, which ensures the query result is emitted by rows.

### Transaction as an Observable

The `tx()` function of `pg-reactive` accepts a callback function where the user is able to organization the data flow within a transaction, which may includes different database operations. The data flow behind this function is actually `query('BEGIN') -> query('Your Command') -> query('COMMIT')` and a `query('ROLLBACK')` will be executed in cause of any error.

Note that unlike the query observable, the tx observable doesn't emit data until the query is completely done. Therefore, the tx observable guarantees to emit nothing if error happens.

## License

MIT
