const _         = require('lodash');
const fs        = require('fs');
const path      = require('path');
const later     = require('later');
const inspector = require('schema-inspector');

const SCHEMA = {
  type:       'object',
  properties: {
    schedules:  {
      type:  'array',
      items: {
        type:       'object',
        properties: {
          '*': {
            type:  'array',
            items: [
              {type: 'integer'}
            ]
          }
        }
      }
    },
    exceptions: {
      optional: true,
      type:     'array',
      items:    {
        type:       'object',
        properties: {
          '*': {
            type:  'array',
            items: [
              {type: 'integer'}
            ]
          }
        }
      }
    },
    files:      {
      type:  'array',
      items: [
        {type: 'string'}
      ]
    }
  }
};

/**
 * This model is essentially the same as https://bunkat.github.io/later/schedules.html with the addition of a file list
 * @param params
 * @returns {Schedule}
 */
const Schedule = function (params) {
  const self = this;

  if (_.isString(params)) {
    params = parse(params);
  }

  inspector.sanitize(SCHEMA, params);
  const result = inspector.validate(SCHEMA, params);

  if (!result.valid) {
    throw new Error(result.format());
  }

  filesExist(params.files);
  self.schedules  = params.schedules;
  self.exceptions = params.exceptions;
  self.files      = params.files;

  return self;
};

const parse = (scheduleString) => {
  const components = scheduleString.split(' ');

  const command = components.shift();
  if (command !== 'run') {
    throw new Error('first word of schedule string must be "run"');
  }

  const filesString = components.shift();
  if (filesString.indexOf('.js') === -1) {
    throw new Error('must provide at least one .js test file to run');
  }
  const files = filesString.split(',');

  scheduleString = components.join(' ');
  const schedule = later.parse.text(scheduleString);

  if (schedule.error > -1) {
    throw new Error(`error while parsing '${scheduleString}' at character ${schedule.error}`);
  }

  schedule.files = files;

  return schedule;
};

const filesExist = (files) => {
  if (!_.every(files, (file) => (path.extname(file) === '.js'))) {
    throw new Error('second word of schedule string must be comma-delimited list of .js files, no spaces');
  }

  _.forEach(files, (file) => {
    if (!fs.existsSync(file)) {
      throw new Error(`file: ${file} not found.`);
    }
  });

  return files;
};

module.exports = Schedule;