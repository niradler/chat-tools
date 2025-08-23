#!/usr/bin/env bash
set -e

echo "🚀 Setting up Chat Tools development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build packages in dependency order
echo "🔨 Building packages..."
pnpm run build --filter @chat-tools/storage
pnpm run build --filter @chat-tools/tui  
pnpm run build --filter @chat-tools/core

echo "✅ Setup complete!"
echo ""
echo "🎯 Quick start:"
echo "  cd examples/basic-chat"
echo "  export OPENAI_API_KEY='your-key-here'"
echo "  pnpm start"
echo ""
echo "📚 Check out the examples in:"
echo "  - examples/basic-chat/ - Simple chat interface"
echo "  - examples/config-based/ - Configuration examples"
