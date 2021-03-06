const camelCase = require("camelcase");
const contentful = require("contentful");
const createRichTextType = require("./lib/types/rich-text");

class ContentfulSource {
  static defaultOptions() {
    return {
      space: undefined,
      accessToken: undefined,
      environment: "master",
      host: "cdn.contentful.com",
      typeName: "Contentful",
      richText: {},
      routes: {},
      parameters: {},
      locales: [undefined],
    };
  }

  constructor(api, options) {
    this.options = options;
    this.typesIndex = {};

    this.client = contentful.createClient({
      accessToken: process.env.GRIDSOME_CONTENTFUL_ACCESS_TOKEN,
      environment: options.environment,
      space: process.env.GRIDSOME_CONTENTFUL_SPACE,
      host: options.host,
    });

    api.loadSource(async (store) => {
      await this.getContentTypes(store);
      await this.getAssets(store);
      await this.getEntries(store);
    });
  }

  async getContentTypes(actions) {
    const contentTypes = await this.fetch("getContentTypes");
    const richTextType = createRichTextType(this.options);

    for (const contentType of contentTypes) {
      const {
        name,
        sys: { id },
      } = contentType;
      const typeName = this.createTypeName(name);
      const route = this.options.routes[name];
      const resolvers = {};

      for (const field of contentType.fields) {
        if (field.type === "RichText") {
          resolvers[field.id] = richTextType;
        }
      }

      actions.addCollection({ typeName, route });
      actions.addSchemaResolvers({
        [typeName]: resolvers,
      });

      this.typesIndex[id] = { ...contentType, typeName };
    }
  }

  async getAssets(actions) {
    const assets = [];
    const parameters = this.options.parameters;
    const locales = this.options.locales;
    const typeName = this.createTypeName("asset");
    const route = this.options.routes.asset;
    const collection = actions.addCollection({ typeName, route });

    for (const locale of locales) {
      assets.push(
        ...(await this.fetch(
          "getAssets",
          1000,
          "sys.createdAt",
          locale
            ? {
                ...parameters,
                locale,
              }
            : parameters
        ))
      );
    }

    for (const asset of assets) {
      const nodeId =
        locales.length === 1
          ? asset.sys.id
          : `${asset.sys.id}_${asset.sys.locale}`;
      collection.addNode({
        ...asset.fields,
        locale: asset.sys.locale,
        id: nodeId,
      });
    }
  }

  async getEntries(actions) {
    const parameters = this.options.parameters;
    const locales = this.options.locales;
    const entries = [];

    for (const locale of locales) {
      entries.push(
        ...(await this.fetch(
          "getEntries",
          1000,
          "sys.createdAt",
          locale ? { ...parameters, locale } : parameters
        ))
      );
    }

    for (const entry of entries) {
      const typeId = entry.sys.contentType.sys.id;
      const { typeName, displayField, fields } = this.typesIndex[typeId];
      const collection = actions.getCollection(typeName);
      const node = {};

      node.title = entry.fields[displayField];
      node.date = entry.sys.createdAt; // TODO: deprecate this
      node.createdAt = entry.sys.createdAt;
      node.updatedAt = entry.sys.updatedAt;
      node.locale = entry.sys.locale;

      for (const idx in fields) {
        const key = fields[idx].id;
        const value = entry.fields[key];
        if (Array.isArray(value)) {
          node[key] = value.map((item) =>
            this.isReference(item) ? this.createReference(item, actions) : item
          );
        } else if (this.isReference(value)) {
          node[key] = this.createReference(value, actions);
        } else if (this.isRichText(value)) {
          node[key] = JSON.stringify(value); // Rich Text
        } else {
          node[key] = value;
        }
      }

      node.id =
        locales.length === 1
          ? entry.sys.id
          : `${entry.sys.id}_${entry.sys.locale}`;
      collection.addNode(node);
    }
  }

  async fetch(method, limit = 1000, order = "sys.createdAt", parameters = {}) {
    const fetch = (skip) =>
      this.client[method]({ ...parameters, skip, limit, order });
    const { total, items } = await fetch(0);
    const pages = Math.ceil(total / limit);

    for (let i = 1; i < pages; i++) {
      const res = await fetch(limit * i);
      items.push(...res.items);
    }

    return items;
  }

  createReference(item, store) {
    const locales = this.options.locales;

    switch (item.sys.type) {
      case "Asset":
        return store.createReference(
          this.createTypeName("asset"),
          locales.length === 1
            ? item.sys.id
            : `${item.sys.id}_${item.sys.locale}`
        );

      case "Entry":
        const contentType = this.typesIndex[item.sys.contentType.sys.id];
        const typeName = this.createTypeName(contentType.name);

        return store.createReference(
          typeName,
          locales.length === 1
            ? item.sys.id
            : `${item.sys.id}_${item.sys.locale}`
        );
    }
  }

  createTypeName(name = "") {
    return camelCase(`${this.options.typeName} ${name}`, { pascalCase: true });
  }

  isReference(value) {
    return typeof value === "object" && typeof value.sys !== "undefined";
  }

  isRichText(value) {
    return typeof value === "object" && value.nodeType === "document";
  }
}

module.exports = ContentfulSource;
