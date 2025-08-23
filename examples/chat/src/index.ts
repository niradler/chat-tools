#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { ChatApp } from './ChatApp.js';

console.log('Starting Package Version Checker Chat...');
console.log('Make sure Ollama is running with qwen3:30b model');
console.log('Press Ctrl+C to exit\n');

const { waitUntilExit } = render(React.createElement(ChatApp));

waitUntilExit().then(() => {
  console.log('\nGoodbye!');
  process.exit(0);
}).catch((error) => {
  console.error('Application error:', error);
  process.exit(1);
});