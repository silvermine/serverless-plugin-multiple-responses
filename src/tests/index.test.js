'use strict';

var expect = require('expect.js'),
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
      // TODO: finish this testing
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
