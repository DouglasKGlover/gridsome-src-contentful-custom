# gridsome-src-contentful-custom

> CUSTOM(!) Contentful source for Gridsome.

This is an alteration of a PR on the `@gridsome/contentful-source` plugin with customizations for localization. In the current PR (which hasn't been accepted at this time) assets do not localize properly. This resolves that issue.

Refer to the [`original plugin`](https://github.com/gridsome/gridsome/tree/master/packages/source-contentful) for usage, as well as the [`PR, here`](https://github.com/gridsome/gridsome/pull/1341). Confirm before using this that there are not significant updates to the OG. At the time of publishing, the `@gridsome/contentful-source` plugin was in beta.

## Usage

### gridsome.config.js

```js
module.exports = {
  plugins: [
    {
      use: "@gridsome/source-contentful",
      options: {
        space: "YOUR_SPACE", // required
        accessToken: "YOUR_ACCESS_TOKEN", // required
        host: "cdn.contentful.com",
        environment: "master",
        typeName: "Contentful",
      },
    },
  ],
};
```

### package.json

Download this repo and place it into a folder in your project (e.g. `custom/gridsome-src-contentful-custom`). Replace `<path-to-local-copy>` below with the path to that folder.

```js
  {
    "dependencies": {
      "@gridsome/source-contentful": "file:<path-to-local-copy>",
    },
  }
```
