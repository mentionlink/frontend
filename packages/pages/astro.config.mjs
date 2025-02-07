// Copyright 2024 Mention Ads. All rights reserved.
// Use of this source code is governed by the PolyForm Shield 1.0.0 license
// that can be found in the LICENSE.md file at the root of this repository.

import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  site: "https://www.mentionads.com",
  integrations: [starlight({
    title: "Mention Ads",
    social: {
      github: "https://github.com/mentionads/frontend"
    },
    sidebar: [{
      label: "Intro",
      items: [
        {
          label: "What is Mention Ads?",
          slug: "pitch"
        }]
    }, {
      label: "Setup",
      autogenerate: { directory: "setup" },
    }, {
      label: "FAQ",
      slug: "faq",
    }, {
      label: "Config",
      slug: "config",
    }, {
      label: "Changelog",
      slug: "changelog",
    }],
    customCss: [
      "@fontsource-variable/space-grotesk/index.css",
      "@fontsource-variable/jetbrains-mono/index.css",
      "./src/themes/custom.css",
    ],
  })]
});