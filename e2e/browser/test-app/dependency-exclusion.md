NextJS 15 brings in `sharp` as an optional dependency, which causes a concern because
it is licensed under LGPL 3.0, which is incompatible with our policy. NextJS is
therefore installed without optional dependencies using the `--omit=optional` flag.
See the `test:e2e:browser:build` script in the pain `package.json`.

For reference, this issue was [reported to NextJS](https://github.com/vercel/next.js/issues/72406).
