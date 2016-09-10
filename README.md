# Serverless Plugin: Multiple Responses

[![Build Status](https://travis-ci.org/silvermine/serverless-plugin-multiple-responses.png?branch=master)](https://travis-ci.org/silvermine/serverless-plugin-multiple-responses)
[![Coverage Status](https://coveralls.io/repos/github/silvermine/serverless-plugin-multiple-responses/badge.svg?branch=master)](https://coveralls.io/github/silvermine/serverless-plugin-multiple-responses?branch=master)
[![Dependency Status](https://david-dm.org/silvermine/serverless-plugin-multiple-responses.png)](https://david-dm.org/silvermine/serverless-plugin-multiple-responses)
[![Dev Dependency Status](https://david-dm.org/silvermine/serverless-plugin-multiple-responses/dev-status.png)](https://david-dm.org/silvermine/serverless-plugin-multiple-responses#info=devDependencies&view=table)


## What is it?

This is a plugin for the Serverless framework intended to address the issues outlined
at https://github.com/serverless/serverless/issues/2046 (and in my - jthomerson -
comments there).

Once that feature is supported in SLS this plugin will no longer be needed or maintained.

## How do I use it?

The basic principle is that instead of adding a `response` attribute to your
HTTP event config, you will add a `responses` attribute.

The responses attribute is a key/value pair where the key is the status code of
the response (e.g. 200, 404, etc). The value can be:

   * `false` - which means "remove the default response configured by SLS (or another plugin) for this response code"
   * an object with the following attributes:
      * `headers` - just the same as the SLS `headers` attribute
      * `templates` - similar to request templates, this is keyed by the response content type
      * `properties` - any other properties to directly add to the CloudFormation template for this API method
         * typically this is used to add `SelectionPattern` for the error responses

NOTE: leaving one response without a selection pattern attribute makes it the
default response.

Below we will show two examples: a standard example where 200 is what your
function returns for a successful completion, and another example where it
needs to return a 302 as its default (non-error) response. The 302 response
example would be used if your were building a bit.ly-like endpoint, for
example.

```yml
# I recommend using variables to define your responses since they tend
# to be the same across all of your API gateway functions, but you
# certainly don't have to.
custom:
   defaultRegion: us-east-1
   region: ${opt:region, self:custom.defaultRegion}
   stage: ${opt:stage, env:USER}
   standardRequest:
      template:
         application/json: ${file(templates/standard-request.tpl)}
   standardResponseHeaders:
      'Access-Control-Allow-Origin': "'*'"
      'Content-Type': 'integration.response.body.headers.Content-Type'
      'Expires': 'integration.response.body.headers.Expires'
      'Cache-Control': 'integration.response.body.headers.Cache-Control'
      'Pragma': "'no-cache'"
   standardResponseTemplate: "$input.path('$.body')"
   errorResponseHeaders:
      'Access-Control-Allow-Origin': "'*'"
      'Expires': "'Thu, 19 Nov 1981 08:52:00 GMT'"
      'Cache-Control': "'no-cache, max-age=0, must-revalidate'"
      'Pragma': "'no-cache'"
   errorResponseTemplate: "$input.path('$.errorMessage')"
   # Here we are defining what would be under "responses" in your HTTP event
   # if you were not using the custom variables.
   standardResponses:
      200:
         headers: ${self:custom.standardResponseHeaders}
         templates:
            'application/json;charset=UTF-8': ${self:custom.standardResponseTemplate}
      404:
         headers: ${self:custom.errorResponseHeaders}
         templates:
            'application/json;charset=UTF-8': ${self:custom.errorResponseTemplate}
         properties:
            SelectionPattern: '.*\"status\":404.*'
      500:
         headers: ${self:custom.errorResponseHeaders}
         templates:
            'application/json;charset=UTF-8': ${self:custom.errorResponseTemplate}
         properties:
            SelectionPattern: '.*\"status\":500.*'
   redirectResponses:
      # Since we want to return 302 upon a successful completion, we remove the
      # built-in default of 200
      200: false
      302:
         headers:
            Location: "integration.response.body.headers.Location"
         templates:
            'application/json;charset=UTF-8': "$input.path('$.body')"
            'text/html;charset=UTF-8': "$input.path('$.body')"
      404:
         headers: ${self:custom.errorResponseHeaders}
         templates:
            'application/json;charset=UTF-8': "$input.path('$.body')"
            'text/html;charset=UTF-8': "$input.path('$.body')"
         properties:
            SelectionPattern: '.*\"status\":404.*'
      500:
         headers: ${self:custom.errorResponseHeaders}
         templates:
            'application/json;charset=UTF-8': "$input.path('$.body')"
            'text/html;charset=UTF-8': "$input.path('$.body')"
         properties:
            SelectionPattern: '.*\"status\":500.*'

# Tell your service that you want to use this plugin:
# (you'll need to `npm install` it first)
plugins:
   - serverless-plugin-multiple-responses

# In the function's http event configuration you see where
# we have `responses` instead of the normal `response`.
functions:
   ping:
      name: ${self:service}-${self:provider.stage}-ping
      handler: src/ping/Ping.handler
      memorySize: 128
      timeout: 2
      events:
         - http:
            method: GET
            path: ping
            request: ${self:custom.standardRequest}
            responses: ${self:custom.standardResponses}
   redirector:
      name: ${self:service}-${self:provider.stage}-redirector
      handler: src/redirector/Redirector.handler
      memorySize: 128
      timeout: 2
      events:
         - http:
            method: GET
            path: redirector
            request: ${self:custom.standardRequest}
            responses: ${self:custom.redirectResponses}
```


## How do I contribute?

Easy! Pull requests are welcome! Just do the following:

   * Clone the code
   * Install the dependencies with `npm install`
   * Create a feature branch (e.g. `git checkout -b my_new_feature`)
   * Make your changes and commit them with a reasonable commit message
   * Make sure the code passes our standards with `grunt standards`
   * Make sure all unit tests pass with `npm test`

Our goal is 100% unit test coverage, with **good and effective** tests (it's
easy to hit 100% coverage with junk tests, so we differentiate). We **will not
accept pull requests for new features that do not include unit tests**. If you
are submitting a pull request to fix a bug, we may accept it without unit tests
(we will certainly write our own for that bug), but we *strongly encourage* you
to write a unit test exhibiting the bug, commit that, and then commit a fix in
a separate commit. This *greatly increases* the likelihood that we will accept
your pull request and the speed with which we can process it.


## License

This software is released under the MIT license. See [the license file](LICENSE) for more details.
