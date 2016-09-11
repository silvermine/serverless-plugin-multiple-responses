'use strict';

var _ = require('underscore'),
    expect = require('expect.js'),
    sinon = require('sinon'),
    Plugin = require('../index.js');

describe('serverless-plugin-multiple-responses', function() {

   describe('init', function() {

      it('registers the appropriate hook', function() {
         var plugin = new Plugin();

         expect(plugin.hooks['before:deploy:deploy']).to.be.a('function');
      });

      it('registers a hook that calls amendResources', function() {
         var spy = sinon.spy(),
             ExtPlugin = Plugin.extend({ amendResources: spy }),
             plugin = new ExtPlugin();

         plugin.hooks['before:deploy:deploy']();

         expect(spy.called).to.be.ok();
         expect(spy.calledOn(plugin));
      });

   });


   describe('amendResources', function() {

      it('calls amendEvent for each function / http event combo, but not other events', function() {
         var fn1Def = { events: [ { http: 'fn1evt1Def' } ] },
             fn2Def = { events: [ { rate: 'fn2evt1Def' }, { http: 'fn2evt2Def' } ] },
             fn3Def = { events: [ { rate: 'fn31evt1Def' } ] },
             fn4Def = { events: [ { http: 'fn4evt1Def' }, { http: 'fn4evt2Def' } ] },
             fns = { fn1: fn1Def, fn2: fn2Def, fn3: fn3Def, fn4: fn4Def },
             plugin = new Plugin({ service: { functions: fns } }),
             mock = sinon.mock(plugin);

         mock.expects('amendEvent').once().withExactArgs('fn1', fn1Def, 'fn1evt1Def');
         // fn2evt1 is skipped as wrong type
         mock.expects('amendEvent').once().withExactArgs('fn2', fn2Def, 'fn2evt2Def');
         // fn3 is skipped with no matching events
         mock.expects('amendEvent').once().withExactArgs('fn4', fn4Def, 'fn4evt1Def');
         mock.expects('amendEvent').once().withExactArgs('fn4', fn4Def, 'fn4evt2Def');

         plugin.amendResources();

         mock.verify();
      });

   });


   describe('amendEvent', function() {

      function getCompiledTemplate() {
         return {
            Resources: {
               ServerlessDeploymentBucket: { Type: 'AWS::S3::Bucket' },
               PingLambdaFunction: {
                  Type: 'AWS::Lambda::Function',
                  Properties: {
                     Code: {
                        S3Bucket: { Ref: 'ServerlessDeploymentBucket' },
                        S3Key: '1473599092284-2016-09-11T13:04:52.284Z/petstore.zip'
                     },
                     FunctionName: 'petstore-jrthomer-ping',
                     Handler: 'src/ping/Ping.handler',
                     MemorySize: 128,
                     Role: { 'Fn::GetAtt': [ 'IamRoleLambdaExecution', 'Arn' ] },
                     Runtime: 'nodejs4.3',
                     Timeout: 2
                  }
               },
               ApiGatewayRestApi: {
                  Type: 'AWS::ApiGateway::RestApi',
                  Properties: { Name: 'jrthomer-petstore' }
               },
               ApiGatewayResourcePing: {
                  Type: 'AWS::ApiGateway::Resource',
                  Properties: {
                     ParentId: { 'Fn::GetAtt': [ 'ApiGatewayRestApi', 'RootResourceId' ] },
                     PathPart: 'ping',
                     RestApiId: { Ref: 'ApiGatewayRestApi' }
                  }
               },
               ApiGatewayMethodPingGet: {
                  Type: 'AWS::ApiGateway::Method',
                  Properties: {
                     AuthorizationType: 'NONE',
                     HttpMethod: 'GET',
                     MethodResponses: [
                        { ResponseModels: {}, ResponseParameters: {}, StatusCode: 200 },
                        { StatusCode: 400 },
                        { StatusCode: 401 },
                        { StatusCode: 403 },
                        { StatusCode: 404 },
                        { StatusCode: 422 },
                        { StatusCode: 500 },
                        { StatusCode: 502 },
                        { StatusCode: 504 }
                     ],
                     RequestParameters: {},
                     Integration: {
                        IntegrationHttpMethod: 'POST',
                        Type: 'AWS',
                        Uri: 'someuri',
                        RequestTemplates: {
                           'application/json': 'jsonrequesttemplate',
                           'application/x-www-form-urlencoded': 'formencodedrequesttemplate',
                        },
                        PassthroughBehavior: 'NEVER',
                        IntegrationResponses: [
                           {
                              StatusCode: 200,
                              ResponseParameters: {},
                              ResponseTemplates: {}
                           },
                           { StatusCode: 400, SelectionPattern: '.*\\[400\\].*' },
                           { StatusCode: 401, SelectionPattern: '.*\\[401\\].*' },
                           { StatusCode: 403, SelectionPattern: '.*\\[403\\].*' },
                           { StatusCode: 404, SelectionPattern: '.*\\[404\\].*' },
                           { StatusCode: 422, SelectionPattern: '.*\\[422\\].*' },
                           { StatusCode: 500, SelectionPattern: '.*(Process\\s?exited\\s?before\\s?completing\\s?request|\\[500\\]).*' },
                           { StatusCode: 502, SelectionPattern: '.*\\[502\\].*' },
                           { StatusCode: 504, SelectionPattern: '.*\\[504\\].*' }
                        ]
                     },
                     ResourceId: { Ref: 'ApiGatewayResourcePing' },
                     RestApiId: { Ref: 'ApiGatewayRestApi' }
                  }
               }
            }
         };
      }

      function deleteFromArray(obj, arrName, ind) {
         obj[arrName] = _.reject(obj[arrName], function(v, i) {
            return i === ind;
         });
      }

      function runTest(responses, modifier, methodPath) {
         var template = getCompiledTemplate(),
             expectedTemplate = getCompiledTemplate(),
             fnDef, sls, plugin;

         sls = {
            service: {
               provider: {
                  compiledCloudFormationTemplate: template,
               },
            },
            cli: { log: _.noop },
         };

         fnDef = {
            name: 'petstore-jrthomer-ping',
            handler: 'src/ping/Ping.handler',
            memorySize: 128,
            timeout: 2,
            events: [
               {
                  http: {
                     method: 'GET',
                     path: methodPath || 'ping',
                     request: 'irrelevant for this test',
                     responses: responses,
                  },
               },
            ],
         };

         modifier(expectedTemplate);

         plugin = new Plugin(sls);
         plugin.amendEvent('ping', fnDef, fnDef.events[0].http);

         expect(sls.service.provider.compiledCloudFormationTemplate).to.eql(expectedTemplate);
      }

      it('removes existing responses when false is passed', function() {
         runTest({ '200': false, '422': false }, function(expectedTemplate) {
            deleteFromArray(expectedTemplate.Resources.ApiGatewayMethodPingGet.Properties, 'MethodResponses', 0);
            deleteFromArray(expectedTemplate.Resources.ApiGatewayMethodPingGet.Properties.Integration, 'IntegrationResponses', 0);

            // 422 is actually index 5, but will be 4 after the other modification
            deleteFromArray(expectedTemplate.Resources.ApiGatewayMethodPingGet.Properties, 'MethodResponses', 4);
            deleteFromArray(expectedTemplate.Resources.ApiGatewayMethodPingGet.Properties.Integration, 'IntegrationResponses', 4);
         });
      });

      it('handles multiple response templates, headers, etc', function() {
         var responses;

         responses = {
            '200': {
               headers: {
                  'Cache-Control': 'integration.response.body.headers.Cache-Control',
                  Pragma: '\'no-cache\'',
               },
               templates: {
                  'application/json;charset=UTF-8': '$input.path(\'$.body\')',
                  'text/html;charset=UTF-8': '$input.path(\'$.body\')',
               },
            },
            '404': {
               headers: {
                  'Cache-Control': '\'no-cache, max-age=0, must-revalidate\'',
                  Pragma: '\'no-cache\'',
               },
               templates: {
                  'application/json;charset=UTF-8': '$input.path(\'$.errorMessage\')',
                  'text/html;charset=UTF-8': '$input.path(\'$.errorMessage\')',
               },
            },
         };

         runTest(responses, function(expectedTemplate) {
            var get = expectedTemplate.Resources.ApiGatewayMethodPingGet;

            // 200
            _.extend(get.Properties.MethodResponses[0].ResponseParameters, {
               'method.response.header.Cache-Control': 'method.response.header.integration.response.body.headers.Cache-Control',
               'method.response.header.Pragma': 'method.response.header.\'no-cache\'',
            });
            _.extend(get.Properties.Integration.IntegrationResponses[0].ResponseParameters, {
               'method.response.header.Cache-Control': 'integration.response.body.headers.Cache-Control',
               'method.response.header.Pragma': '\'no-cache\'',
            });
            _.extend(get.Properties.Integration.IntegrationResponses[0].ResponseTemplates, {
               'application/json;charset=UTF-8': '$input.path(\'$.body\')',
               'text/html;charset=UTF-8': '$input.path(\'$.body\')',
            });

            // 404
            get.Properties.MethodResponses[4].ResponseParameters = {
               'method.response.header.Cache-Control': 'method.response.header.\'no-cache, max-age=0, must-revalidate\'',
               'method.response.header.Pragma': 'method.response.header.\'no-cache\'',
            };
            get.Properties.Integration.IntegrationResponses[4].ResponseParameters = {
               'method.response.header.Cache-Control': '\'no-cache, max-age=0, must-revalidate\'',
               'method.response.header.Pragma': '\'no-cache\'',
            };
            get.Properties.Integration.IntegrationResponses[4].ResponseTemplates = {
               'application/json;charset=UTF-8': '$input.path(\'$.errorMessage\')',
               'text/html;charset=UTF-8': '$input.path(\'$.errorMessage\')',
            };
         });

      });

      it('can remove the default response and replace it with another (e.g. redirects)', function() {
         var responses;

         responses = {
            '200': false,
            '302': {
               headers: {
                  'Location': 'integration.response.body.headers.Location',
                  Pragma: '\'no-cache\'',
               },
               templates: {
                  'application/json;charset=UTF-8': '$input.path(\'$.body\')',
                  'text/html;charset=UTF-8': '$input.path(\'$.body\')',
               },
            },
            '404': {
               headers: {
                  'Cache-Control': '\'no-cache, max-age=0, must-revalidate\'',
                  Pragma: '\'no-cache\'',
               },
               templates: {
                  'application/json;charset=UTF-8': '$input.path(\'$.errorMessage\')',
                  'text/html;charset=UTF-8': '$input.path(\'$.errorMessage\')',
               },
            },
         };

         runTest(responses, function(expectedTemplate) {
            var get = expectedTemplate.Resources.ApiGatewayMethodPingGet;

            // 302
            get.Properties.MethodResponses.push({
               StatusCode: 302,
               ResponseParameters: {
                  'method.response.header.Location': 'method.response.header.integration.response.body.headers.Location',
                  'method.response.header.Pragma': 'method.response.header.\'no-cache\'',
               },
            });
            get.Properties.Integration.IntegrationResponses.push({
               StatusCode: 302,
               ResponseParameters: {
                  'method.response.header.Location': 'integration.response.body.headers.Location',
                  'method.response.header.Pragma': '\'no-cache\'',
               },
               ResponseTemplates: {
                  'application/json;charset=UTF-8': '$input.path(\'$.body\')',
                  'text/html;charset=UTF-8': '$input.path(\'$.body\')',
               },
            });

            // 404
            get.Properties.MethodResponses[4].ResponseParameters = {
               'method.response.header.Cache-Control': 'method.response.header.\'no-cache, max-age=0, must-revalidate\'',
               'method.response.header.Pragma': 'method.response.header.\'no-cache\'',
            };
            get.Properties.Integration.IntegrationResponses[4].ResponseParameters = {
               'method.response.header.Cache-Control': '\'no-cache, max-age=0, must-revalidate\'',
               'method.response.header.Pragma': '\'no-cache\'',
            };
            get.Properties.Integration.IntegrationResponses[4].ResponseTemplates = {
               'application/json;charset=UTF-8': '$input.path(\'$.errorMessage\')',
               'text/html;charset=UTF-8': '$input.path(\'$.errorMessage\')',
            };

            // 200
            deleteFromArray(expectedTemplate.Resources.ApiGatewayMethodPingGet.Properties, 'MethodResponses', 0);
            deleteFromArray(expectedTemplate.Resources.ApiGatewayMethodPingGet.Properties.Integration, 'IntegrationResponses', 0);
         });

      });

      it('short circuits safely if it can not find the CloudFormation object for this function', function() {
         runTest({}, _.noop, 'non-existent-path');
      });

      it('short circuits safely if there are no responses defind on the config', function() {
         runTest(undefined, _.noop);
      });

   });


   describe('_normalize', function() {
      var plugin = new Plugin();

      it('returns undefined for empty strings', function() {
         expect(plugin._normalize('')).to.be(undefined);
         expect(plugin._normalize(false)).to.be(undefined);
         expect(plugin._normalize()).to.be(undefined);
         expect(plugin._normalize('', true)).to.be(undefined);
         expect(plugin._normalize(false, true)).to.be(undefined);
         expect(plugin._normalize(undefined, true)).to.be(undefined);
      });

      it('lowercases the rest of the string if told to do so', function() {
         expect(plugin._normalize('someTHING', true)).to.eql('Something');
         expect(plugin._normalize('SomeTHING', true)).to.eql('Something');
         expect(plugin._normalize('s', true)).to.eql('S');
         expect(plugin._normalize('S', true)).to.eql('S');
      });

      it('only modifies the first letter by default', function() {
         expect(plugin._normalize('someTHING')).to.eql('SomeTHING');
         expect(plugin._normalize('SomeTHING')).to.eql('SomeTHING');
         expect(plugin._normalize('s')).to.eql('S');
         expect(plugin._normalize('S')).to.eql('S');
      });

   });


   describe('_capitalizeAlphaNumericPath', function() {
      var plugin = new Plugin();

      it('removes unwanted characters and capitalizes for each piece of path', function() {
         expect(plugin._capitalizeAlphaNumericPath('some/path45/to_some-place%.json')).to.eql('SomePath45Tosomeplacejson');
      });

   });

});
