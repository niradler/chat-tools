#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { ChatApp } from './ChatApp';
import { DEFAULT_CONFIG } from '@chat-tools/core';

// Example: Basic chat with minimal configuration
const config = {
  ...DEFAULT_CONFIG,
  name: 'Basic Chat Example',
  ai: {
    provider: 'openai' as const,
    model: 'gpt-3.5-turbo',
    apiKey: process.env.OPENAI_API_KEY || '',
    maxTokens: 2000,
    temperature: 0.7,
  },
  database: {
    path: './data/basic-chat.db',
  },
  // No MCP servers, just basic chat
  mcp: {
    servers: [],
    timeout: 10000,
  },
  // Minimal tools
  tools: {
    enabled: ['execute_command'],
    disabled: [],
    custom: [],
  },
};

console.log('🚀 Starting Basic Chat Example...');
console.log('📝 This example shows a simple chat interface with basic shell command support');
console.log('🔑 Make sure to set your OPENAI_API_KEY environment variable');
console.log('');

render(<ChatApp config={config} />);
