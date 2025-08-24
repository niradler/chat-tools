#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { ChatApp } from './ChatApp.js';

console.log('🤖 Starting Interactive Chat with Tool Approval...');
console.log('📋 Features: Session Management, History, Tool Approval, MCP Integration');
console.log('🔧 Make sure Ollama is running with qwen3:30b model');
console.log('⌨️  Keyboard shortcuts: Ctrl+S (Sessions), Ctrl+H (History), Ctrl+C (Chat)');
console.log('🚪 Press Ctrl+C to exit\n');

const { waitUntilExit } = render(React.createElement(ChatApp));

waitUntilExit().then(() => {
  console.log('\nGoodbye!');
  process.exit(0);
}).catch((error: any) => {
  console.error('Application error:', error);
  process.exit(1);
});