/*eslint no-process-env: "off"*/
/*eslint no-console: "off"*/
const path      = require('path');
const gulp      = require('gulp');
const mocha     = require('gulp-mocha');
const eslint    = require('gulp-eslint');
const istanbul  = require('gulp-istanbul');
const coveralls = require('gulp-coveralls');

gulp.task('test:dirty', () => {
  return gulp.src('tests/**/*.spec.js')
  .pipe(mocha({reporter: 'spec'}));
});

gulp.task('pre-test', () => {
  return gulp.src('app/**/*.js')
  .pipe(istanbul())
  .pipe(istanbul.hookRequire());
});

gulp.task('test:coverage', ['pre-test'], () => {
  return gulp.src(['tests/**/*.spec.js'])
  .pipe(mocha({reporter: 'spec'}))
  .once('error', () => {
    console.error('tests failed');
    process.exit(1);
  })
  .pipe(istanbul.writeReports({
    reporters: [
      'text',
      'html',
      'lcov'
    ]
  }))
  .pipe(istanbul.enforceThresholds({thresholds: {global: 80}}))
  .once('error', () => {
    console.error('coverage failed');
    process.exit(1);
  });
});

const lint = () => {
  return gulp.src([
    '**/*.js',
    '!node_modules/**',
    '!coverage/**'
  ])
  .pipe(eslint({
    fix: true
  }))
  .pipe(eslint.format())
  .pipe(eslint.failAfterError())
  .once('error', () => {
    console.error('lint failed');
    process.exit(1);
  });
};

gulp.task('test:lint', ['test:coverage'], () => {
  return lint();
});

gulp.task('lint', () => {
  return lint();
});

gulp.task('test', ['test:lint'], () => {
  process.exit();
});

gulp.task('coveralls', ['test:lint'], () => {
  if (!process.env.CI) {
    process.exit(1);
    return;
  }

  return gulp.src(path.join(__dirname, 'coverage/lcov.info'))
  .pipe(coveralls())
  .once('error', () => {
    console.error('coveralls failed');
    process.exit(1);
  })
  .once('end', () => {
    process.exit();
  });
});