'use strict';

var _ = require('underscore'),
    Class = require('class.extend');

module.exports = Class.extend({

   init: function(serverless, opts) {
      this._serverless = serverless;
      this._opts = opts;

      this.hooks = {
         'before:deploy:deploy': this.amendResources.bind(this),
      };
   },

   amendResources: function() {
      var self = this;

      _.each(this._serverless.service.functions, function(fnDef, fnName) {
         _.each(fnDef.events, function(evt) {
            if (evt.http) {
               self.amendEvent(fnName, fnDef, evt.http);
            }
         });
      });
   },

   amendEvent: function(fnName, fnDef, httpDef) {
      var normalizedPath = this._capitalizeAlphaNumericPath(httpDef.path),
          normalizedMethodName = 'ApiGatewayMethod' + normalizedPath + this._normalize(httpDef.method, true),
          cfnObj = this._serverless.service.provider.compiledCloudFormationTemplate.Resources[normalizedMethodName];

      if (_.isEmpty(cfnObj)) {
         return this._serverless.cli.log('Error: could not find CloudFormation object for ' + fnName + ':' + httpDef.path);
      }

      if (!httpDef.responses) {
         return;
      }

      _.each(httpDef.responses, function(respDef, statusCode) {
         var search = { StatusCode: parseInt(statusCode, 10) },
             cfnIntResp = _.findWhere(cfnObj.Properties.Integration.IntegrationResponses, search),
             cfnMethResp = _.findWhere(cfnObj.Properties.MethodResponses, search);

         if (respDef === false) {
            // this is a special case where we remove this default response that was added by another plugin
            cfnObj.Properties.Integration.IntegrationResponses = _.reject(cfnObj.Properties.Integration.IntegrationResponses, search);
            cfnObj.Properties.MethodResponses = _.reject(cfnObj.Properties.MethodResponses, search);
            return;
         }

         if (!cfnIntResp) {
            cfnIntResp = { StatusCode: statusCode };
            cfnObj.Properties.Integration.IntegrationResponses.push(cfnIntResp);
         }

         if (!cfnMethResp) {
            cfnMethResp = { StatusCode: statusCode };
            cfnObj.Properties.MethodResponses.push(cfnMethResp);
         }

         cfnIntResp.ResponseParameters = cfnIntResp.ResponseParameters || {};
         cfnMethResp.ResponseParameters = cfnMethResp.ResponseParameters || {};

         _.each(respDef.headers, function(val, name) {
            var realName = 'method.response.header.' + name;

            cfnIntResp.ResponseParameters[realName] = val;
            cfnMethResp.ResponseParameters[realName] = 'method.response.header.' + val;
         });

         cfnIntResp.ResponseTemplates = _.extend({}, cfnIntResp.ResponseTemplates, respDef.templates);

         _.extend(cfnIntResp, respDef.properties);
      });

      // if you need to debug:
      // console.log(require('util').inspect(cfnObj, { depth: null }));
   },

   _normalize: function(s, lower, addVar) {
      if (_.isEmpty(s)) {
         return;
      }

      if (lower) {

         return s[0].toUpperCase() + s.substr(1).toLowerCase() + (addVar ? 'Var' : '');
      }

      return s[0].toUpperCase() + s.substr(1) + (addVar ? 'Var' : '');
   },

   _capitalizeAlphaNumericPath: function(path) {
      return _.reduce(path.split('/'), function(memo, part) {
         return memo + this._normalize(part.replace(/[^0-9A-Za-z]/g, ''), true, part.indexOf('{') === 0);
      }.bind(this), '');
   },

});
