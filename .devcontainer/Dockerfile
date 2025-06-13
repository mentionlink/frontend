# Copyright 2025 Mention Ads. All rights reserved.
# Use of this source code is governed by the PolyForm Shield 1.0.0 license
# that can be found in the LICENSE.md file at the root of this repository.

FROM mcr.microsoft.com/devcontainers/javascript-node:1-20

# If on Mac, Docker builds may lead to hash sum mismatch errors; to fix, you must turn off:
# System Settings > Screen Time > Content & Privacy Restrictions
# and restart your Mac.

RUN npm install --global @playwright/test svgo
RUN npx playwright install --with-deps

RUN apt-get update && \
  apt-get install --yes curl git git-lfs librsvg2-bin ripgrep tree wget

RUN curl -fsSL https://d2lang.com/install.sh | sh -s --

COPY welcome.txt /usr/local/etc/vscode-dev-containers/first-run-notice.txt