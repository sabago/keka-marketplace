#!/bin/bash
# Helper script to run Prisma commands with Node.js v16 compatibility

node --experimental-wasm-reftypes ./node_modules/.bin/prisma "$@"
