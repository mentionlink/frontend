#!/bin/bash
# Copyright 2025 Mention Ads. All rights reserved.
# Use of this source code is governed by the PolyForm Shield 1.0.0 license
# that can be found in the LICENSE.md file at the root of this repository.

git config core.hooksPath .githooks

pushd packages/pages
npm ci
npm run build
popd

pushd packages/script
npm ci
npm run build
popd