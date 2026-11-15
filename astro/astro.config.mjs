// @ts-check
import { defineConfig, envField, passthroughImageService } from 'astro/config';
import alpinejs from '@astrojs/alpinejs';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.stadtratwatch.de',
  env: {
    schema: {
      DEFAULT_PARLIAMENT_PERIOD: envField.string({
        context: 'server',
        access: 'public',
        optional: false
      }),
      AWS_CLOUDFRONT_BASE_URL: envField.string({
        context: 'client',
        access: 'public',
        optional: false,
      }),
      TYPESENSE_HOST: envField.string({
        context: 'client',
        access: 'public',
        optional: false,
      }),
      TYPESENSE_PORT: envField.number({
        context: 'client',
        access: 'public',
        optional: false,
      }),
      TYPESENSE_PROTOCOL: envField.string({
        context: 'client',
        access: 'public',
        optional: false,
      }),
      TYPESENSE_SEARCH_ONLY_API_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: false,
      }),
      SRW_FEATURE_FLAGS: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
        default: ''
      }),
    },
  },

  integrations: [alpinejs(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },

  image: {
    service: passthroughImageService(),
  },
});
