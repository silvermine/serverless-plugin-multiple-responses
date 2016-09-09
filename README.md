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

TODO: provide an example of how to configure it in serverless.yml

```yml
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
