const _       = require('lodash');
const express = require('express');
const router  = express.Router();
const cors    = require('cors');

const api    = require('./api');

module.exports = (app, config) => {
  const log    = config.log;

  if (!app || !app.services) {
    throw new Error('app.services must be defined');
  }

  // Check for API key regardless of the route
  app.use('*', router.use((req, res, next) => {
    if (_.isString(config.apiKey)) {
      const apiKey = req.headers.api_key || req.headers.API_KEY;

      if (!_.isString(apiKey)) {
        res.status(400);
        res.send({error: 'api key required'});
      } else {
        log.info(`api key provided`);

        if (apiKey !== config.apiKey) {
          res.status(401);
          log.error(`unknown api key`);
          res.send({error: 'unknown api key'});
        } else {
          next();
        }
      }
    } else {
      next();
    }
  }));

  // Enable CORS pre-flight for all routes
  app.options('*', cors());

  // All valid routes handled here
  app.use(api(app.services));

  // Everything else is a 404
  app.use((req, res) => {
    res.status(404);
    res.send({error: 'Not found'});
  });
};