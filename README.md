# Walc
Warning, Alert, Log, Console ect...

Removes `console` or `alert` functions in your scripts.

## Install

```console
$ npm install walc
```

## Usage

```javascript
var walc = require('walk'),
    w    = new walc({
            path: './js/*.js', 
            methods: {alert: 'remove', console: 'comment'
          })
w.run()
```


## Options

- `path` : String or Array. ex : `"path/to/directory/*.js"` or `"path/to/directory/script.js"` or `["path/to/directory/*.js"`] or [`"path/to/directory/script.js"]`

- `methods` : Object. `console` or `alert` for keys, and values has 3 possibilities : `remove`, `comment` or `ignore` (default). 

## Notes

This script ignores `console` and `alert` already commented. 