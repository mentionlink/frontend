# Copyright 2025 Mention Ads. All rights reserved.
# Use of this source code is governed by the PolyForm Shield 1.0.0 license
# that can be found in the LICENSE.md file at the root of this repository.

FROM mcr.microsoft.com/devcontainers/javascript-node:1-18

# If on Mac, Docker builds may lead to hash sum mismatch errors; to fix, you must turn off:
# System Settings > Screen Time > Content & Privacy Restrictions

RUN npm install --global @playwright/test
RUN npx playwright install --with-deps

COPY welcome.txt /usr/local/etc/vscode-dev-containers/first-run-notice.txt