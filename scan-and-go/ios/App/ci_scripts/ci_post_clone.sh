#!/bin/sh
# Xcode Cloud: rebuild web assets and copy them into the iOS shell before archiving.
set -e
export HOMEBREW_NO_INSTALL_CLEANUP=1
brew install node
cd "$CI_PRIMARY_REPOSITORY_PATH/scan-and-go"
npm ci
node app/build.js
npx cap copy ios
