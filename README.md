# pg-reactive

![build status](https://travis-ci.org/haoliangyu/pg-reactive.svg?branch=master)

[![ReactiveX](http://reactivex.io/assets/Rx_Logo_S.png)](http://reactivex.io/)

[RxJS 5](http://reactivex.io/) interface for PostgreSQL in node.js


## Installation


``` bash
npm install pg-reactive
```

## Example

``` javascript
import pgrx from 'pg-reactive';

let db = new pgrx('postgres://postgres@$localhost/tester', {
  pool: true
});

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

  `pgrx` provides automatic pooling for database connections (see [pg-pool](https://github.com/brianc/node-pg-pool) for details). The automatic pooling can be disabled by providing an additional options:

  ``` javascript
  import pgrx from 'pg-reactive';

  // the pool option is true by default
  let db = new pgrx(url, {
    pool: false
  });
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

## Contribution

PR are welcome!

To run the tests, it needs to a test database running with the following credential:

``` json
{
  "host": "localhost",
  "port": 5432,
  "database": "rx_reactive_test",
  "user": "rx_reactive_tester",
  "password": "1esdf3143"
}
```

Please make sure everything is tested!

## License

MIT
