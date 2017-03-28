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
    console.log('Shifted ID: ', id);
  });
```

## Documentation

* `pgrx` Class

  An database connection class implemented with RxJS. It can be initialized with the database url or a crednetial object:

  ``` json
  {
    "user": "postgres",
    "database": "tester",
    "password": "",
    "host": "localhost",
    "port": 5432
  }
  ```

  `pgrx` will maintain the connection using a connection pool ([pg-pool](https://github.com/brianc/node-pg-pool)) by default. This can be disabled by providing th additional option `{ pool: false }` and then use a single connection ([pg.Client](https://github.com/brianc/node-postgres/wiki/Client)).

* `pgrx.end()` Function

  End the current database connection.

* `pgrx.query(sql[, values])` Function

  Run a query with optional values. This function supports the query formating of [pg](https://github.com/brianc/node-postgres/wiki/Client#parameterized-queries) and you can construct the query like

  ``` javascript
  pgrx.query('SELECT id FROM user WHERE name = $1::text', ['Tom']);
  ```

  It will return an observable that emits every row of the query result.

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
