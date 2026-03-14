#!/bin/bash
cd server
npm install
node build.js
node dist/index.js
