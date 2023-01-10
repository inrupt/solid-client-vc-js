:orphan:

@inrupt/solid-client-vc API Documentation
=========================================

`@inrupt/solid-client-vc <https://npmjs.com/package/@inrupt/solid-client-vc>`__
is a JavaScript library for interacting with servers that implement the `W3C VC
HTTP APIs <https://w3c-ccg.github.io/vc-api/>`__. This library is currently only
expected to be used by `@inrupt/solid-client-access-grants
<https://npmjs.com/package/@inrupt/solid-client-access-grants>`__. You can use
solid-client-vc in Node.js using either CommonJS or ESM modules, and in the browser
with a bundler like Webpack, Rollup, or Parcel.

It is part of a `family open source JavaScript
libraries <https://docs.inrupt.com/developer-tools/javascript/client-libraries/>`__
designed to support developers building Solid applications.

Installation
------------

For the latest stable version of solid-client-vc:

.. code:: bash

   npm install @inrupt/solid-client-vc

Changelog
~~~~~~~~~

See `the release
notes <https://github.com/inrupt/solid-client-vc-js/blob/main/CHANGELOG.md>`__.

Browser support
~~~~~~~~~~~~~~~

Our JavaScript Client Libraries use relatively modern JavaScript
features that will work in all commonly-used browsers, except Internet
Explorer. If you need support for Internet Explorer, it is recommended
to pass them through a tool like `Babel <https://babeljs.io>`__, and to
add polyfills for e.g. ``Map``, ``Set``, ``Promise``, ``Headers``,
``Array.prototype.includes``, ``Object.entries`` and
``String.prototype.endsWith``.

Additionally, when using this package in an environment other than Node.js, you
will need `a polyfill for Node's buffer module
<https://www.npmjs.com/package/buffer>`__.

.. _issues--help:

Issues & Help
-------------

Solid Community Forum
~~~~~~~~~~~~~~~~~~~~~

If you have questions about working with Solid or just want to share
what you're working on, visit the `Solid
forum <https://forum.solidproject.org/>`__. The Solid forum is a good
place to meet the rest of the community.

Bugs and Feature Requests
~~~~~~~~~~~~~~~~~~~~~~~~~

-  For public feedback, bug reports, and feature requests please file an
   issue via
   `Github <https://github.com/inrupt/solid-client-vc-js/issues/>`__.
-  For non-public feedback or support inquiries please use the `Inrupt
   Service Desk <https://inrupt.atlassian.net/servicedesk>`__.

------------

API
===

Modules
-------

.. toctree::
   :glob:
   :titlesonly:

   /modules/**

