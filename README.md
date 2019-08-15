# Why?

Bundle files together, sorted by dependencies, excluding node_modules. Browserify is made to bundle codes for browser usage. What if we just want to bundle 
code for usage in node.js?

# Installation

`npm install --save-dev gulp-bundler2`

# Usage

```javascript
var gulp = require('gulp'),
    bundler = require('gulp-bundler2');

gulp.task('bundle', function() {
  return gulp.src(['./codes/*.js', './api/*.js'])
    .pipe(bundler('bundle.js'))
    .pipe(gulp.dest('./dist/'));
});
```

# Options

```javascript
var gulp = require('gulp'),
    bundler = require('gulp-bundler');

gulp.task('bundle', function() {
  return gulp.src(['./codes/*.js', './api/*.js'])
    .pipe(bundler('bundle.js', {
        ignore: ['ignore.js'] //ignore file with name
    }))
    .pipe(gulp.dest('./dist/'));
});
```

# Todo
* Add more fine grained options
* Ignore options should handle glob pattern