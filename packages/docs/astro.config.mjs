// Copyright 2024 Mentionlink. All rights reserved.
// Use of this source code is governed by the PolyForm Shield 1.0.0 license
// that can be found in the LICENSE.md file at the root of this repository.

import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  site: "https://docs.mentionlink.com",
  integrations: [starlight({
    title: "Mentionlink",
    social: [{
      icon: "github",
      label: "GitHub",
      href: "https://github.com/mentionlink/frontend"
    }],
    editLink: {
      baseUrl: "https://github.com/mentionlink/frontend/edit/main/packages/docs"
    },
    sidebar: [{
      label: "Login",
      link: "https://app.mentionlink.com/accounts/login/",
      attrs: {
        target: "_blank"
      }
    }, {
      label: "Start Here",
      autogenerate: { directory: "start" },
    }, {
      label: "Setup",
      autogenerate: { directory: "setup" },
      collapsed: true,
    }, {
      label: "Config",
      autogenerate: { directory: "config" },
      collapsed: true,
    }, {
      label: "FAQ",
      slug: "faq",
    }, {
      label: "Changelog",
      slug: "changelog",
    }],
    customCss: [
      "@fontsource-variable/rubik/index.css",
      "@fontsource-variable/jetbrains-mono/index.css",
      "./src/themes/custom.css",
    ],
  })]
});