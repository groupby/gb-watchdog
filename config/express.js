const morgan         = require('morgan');
const compression    = require('compression');
const bodyParser     = require('body-parser');
const methodOverride = require('method-override');
const cookieParser   = require('cookie-parser');
const errorHandler   = require('errorhandler');
const cors           = require('cors');
const expressLogger  = require('express-bunyan-logger');
const config         = require('./index');

module.exports = function (app) {
  const env = app.get('env');

  const defaultContentTypeMiddleware = (req, res, next) => {
    req.headers['content-type'] = 'application/json';
    next();
  };

  app.use(defaultContentTypeMiddleware);

  app.use(compression());
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());
  app.use(methodOverride());
  app.use(cookieParser());
  app.use(cors());
  app.use(expressLogger({
    name: `${config.FRAMEWORK_NAME}-express`,
    streams: [{
      level: 'info',
      stream: process.stdout
    }]
  }));

  if ('development' === env || 'test' === env) {
    // app.use(morgan('dev'));
    app.use(errorHandler()); // Error handler - has to be last
  }
};