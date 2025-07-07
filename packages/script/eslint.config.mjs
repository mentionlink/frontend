// Copyright 2024 Mentionlink. All rights reserved.
// Use of this source code is governed by the PolyForm Shield 1.0.0 license
// that can be found in the LICENSE.md file at the root of this repository.

import tseslint from "typescript-eslint";

const config = [
  {
    files: [
      "**/*.ts",
    ],
  }, {
    ignores: [
      "out/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "semi": ["error", "always"],
    },
  },
];

export default config;