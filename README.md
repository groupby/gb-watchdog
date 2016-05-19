## Installation

```
npm install gb-watchdog
```

## API

- `/status` endpoint returns 200 if all sub services are available and monitoring is active
- `/schedules` endpoint allows the addition and removal of schedules. Start/stop scheduler.
- `/results` endpoint returns results, supports ES query argument if connected to ES

## App

- Scheduler uses later.js to schedule/execute test runs
- Reporter records results to slack and elasticsearch 

## Use

Create a file in your project directory called `index.js`
And put something like the following in the file.

```javascript
var Watchdog = require('gb-watchdog');
var configuration = {
    // API key is used to secure the service. 
    // Defaults to no API key.
    // If a key is defined here, you must add a header to all subsequent calls to the service 
    // in the form: `api_key=XXX-XXX-XXX-XXX`
    apiKey: 'XXX-XXX-XXX-XXX',
    
    // Defaults to no elasticsearch integration, only in-memory
    // If provided, you need to specify host, indexSuffix, and apiVersion. Optionally logLevel
    elasticsearch: {
        host:       'localhost:9200',
        indexSuffix: 'my_results_index',
        apiVersion: 2.2
    },
    
    // Defaualts to no slack integration
    slack: {
        url:        'http://my-webhook-url.com',
        username:   'bot-name',
        channel:    '#error-channel'
    },
    
    // Defaults to 7000
    port: 7000
};

var watchdog = new Watchdog(configuration);

// Start API
watchdog.run();

// Create schedule for mocha test file that already exist in the filesystam
watchdog.services.scheduler.add('myScheduleName',
  'run path/test.js every 4 minutes except Saturday,Sunday');

// Or REST command
// curl -XPOST localhost:7000/schedules \
//   -d '{"name":"myScheduleName", "schedule":"run path/test.js every 4 minutes except Saturday,Sunday"}'
```

Run this file using

```bash
  node index.js
```

Wait until it has run. You can check the status of the scheduler to see if it has run yet, and when it will next run.
 
```javascript
// Get the status of the scheduler and testRunner
var schedulerStatus = watchdog.services.scheduler.status();
{
    state: 'running',
    schedules: {
        myScheduleName: {
            prevRun: '2016-05-18T14:46:13+00:00',
            nextRun: '2016-05-18T16:46:13+00:00'
        }
    }
}

// This returns the latest test result, or the current state if one is runnning
// If the test is currently running, you'll see incomplete tests, and end will be null
var testRunnerStatus = watchdog.services.testRunner.status();
{
    start:      '2016-05-18T14:46:13+00:00',
    end:        '2016-05-18T14:46:13+00:00',
    duration:   100, // ms
    passes:     10,
    fails:      1,
    incomplete: 5,
    total:      16,
    tests: [
        {
            name:       'should be first test',
            duration:   2
        },
        {
            name:       'failing test',
            duration:   1000,
            error:      'expected true to be false',
            stack:      'line 200 is broken'
        },
        ......
    ]
}

// Or REST command
// curl localhost:7000/status
{
    scheduler:  { /* scheduler status object */ },
    testRunner: { /* testrunner status object */ },
}
```

You can also get a history of results over time. If you're storing this in elasticsearch, you can supply a query to limit the response.
 
```javascript
var esQuery = {
    query: {
        bool: {
            must: [
                {
                    term: {
                        passes: 5
                    }
                }
            ]
        }
    }
};

var results = watchdog.services.history.getResults(esQuery);
[
    {
        start:      '2016-05-18T14:46:13+00:00',
        end:        '2016-05-18T14:46:13+00:00',
        duration:   100, // ms
        passes:     5,
        fails:      1,
        incomplete: 5,
        total:      11,
        tests: [
            {
                name:       'should be first test',
                duration:   2
            },
            {
                name:       'failing test',
                duration:   1000,
                error:      'expected true to be false',
                stack:      'line 200 is broken'
            },
            ......
        ]
    },
    {
        start:      '2016-05-18T14:46:13+00:00',
        end:        '2016-05-18T14:46:13+00:00',
        duration:   100, // ms
        passes:     5,
        fails:      10,
        incomplete: 0,
        total:      15,
        tests: [
            {
                name:       'should be first test',
                duration:   2
            },
            {
                name:       'failing test',
                duration:   1000,
                error:      'expected true to be false',
                stack:      'line 200 is broken'
            },
            ......
        ]
    },
    .......
]

// Or REST commnd
// curl localhost:7000/results
```

To start/stop the scheduler:
```javascript
// Stop scheduler (started by default)
watchdog.services.scheduler.stop(); 

// Or REST command
// curl -XPOST localhost:7000/schedules/_stop

// Start scheduler
watchdog.services.scheduler.start(); 

// Or REST command
// curl -XPOST localhost:7000/schedules/_start
```

It's important to note that the data will be added and read from the index `watchdog_<indexSuffix>`. 
So pick different suffixes for different applications.

## Future
- Offer hooks rollback to previous version if tests fail
- Add/remove tests at runtime
