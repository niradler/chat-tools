import React, { useState, useEffect } from 'react';
import { render } from 'ink';
import { DrizzleStorage } from '@chat-tools/storage';
import { ChatView, MessageInput, Layout } from '@chat-tools/tui';
import type { Message } from '@chat-tools/tui';
import { Agent } from '@chat-tools/agent';
import type { ChatToolsConfig } from '@chat-tools/core';
import chalk from 'chalk';

export interface ChatAppConfig {
  config: ChatToolsConfig;
  workingDirectory: string;
  verbose?: boolean;
}

export class ChatApp {
  private config: ChatToolsConfig;
  private workingDirectory: string;
  private verbose: boolean;
  private storage!: DrizzleStorage;
  private agent!: Agent;
  private isShuttingDown = false;

  constructor({ config, workingDirectory, verbose = false }: ChatAppConfig) {
    this.config = config;
    this.workingDirectory = workingDirectory;
    this.verbose = verbose;

    // Setup signal handlers for graceful shutdown
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    const handleShutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        // Force exit if already shutting down
        console.log(chalk.red('\n⚠️  Force exiting...'));
        process.exit(1);
      }

      this.isShuttingDown = true;
      console.log(chalk.yellow(`\n📝 Received ${signal}, shutting down gracefully...`));

      try {
        await this.cleanup();
        process.exit(0);
      } catch (error: any) {
        console.error(chalk.red('❌ Error during shutdown:'), error.message);
        process.exit(1);
      }
    };

    // Handle Ctrl+C (SIGINT)
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    // Handle Ctrl+Z in some terminals (SIGTSTP) - note: this might be caught differently
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error(chalk.red('❌ Uncaught exception:'), error.message);
      handleShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('❌ Unhandled rejection at:'), promise, 'reason:', reason);
      handleShutdown('unhandledRejection');
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize storage
      if (this.verbose) {
        console.log(chalk.gray('Initializing storage...'));
      }

      this.storage = new DrizzleStorage(this.config.database.path);
      await this.storage.initialize();

      if (this.verbose) {
        console.log(chalk.green('✓ Storage initialized'));
      }

      // Initialize agent
      if (this.verbose) {
        console.log(chalk.gray('Initializing agent...'));
      }

      this.agent = new AIAgent(this.config, this.storage);

      await this.agent.initialize();

      if (this.verbose) {
        console.log(chalk.green('✓ Agent initialized'));
      }

      // Start TUI
      console.log(chalk.blue('🤖 Chat Assistant Ready!'));
      console.log(chalk.gray('Type your message and press Enter. Use Ctrl+C to exit.'));
      console.log('');

      const { waitUntilExit } = render(
        React.createElement(ChatInterface, {
          agent: this.agent,
          config: this.config,
          verbose: this.verbose
        })
      );

      // Wait for user to exit
      await waitUntilExit();

      // Cleanup
      await this.cleanup();

    } catch (error: any) {
      console.error(chalk.red('❌ Failed to start application:'), error.message);
      if (this.verbose) {
        console.error(chalk.gray(error.stack));
      }
      throw error;
    }
  }



  private async cleanup(): Promise<void> {
    try {
      if (this.verbose) {
        console.log(chalk.gray('Cleaning up...'));
      }

      // Cleanup agent with timeout
      if (this.agent) {
        const cleanupPromise = this.agent.cleanup();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Agent cleanup timeout')), 5000)
        );

        try {
          await Promise.race([cleanupPromise, timeoutPromise]);
        } catch (error: any) {
          console.error(chalk.yellow('⚠️  Agent cleanup timed out or failed:'), error.message);
        }
      }

      // Cleanup storage with timeout
      if (this.storage) {
        try {
          const storageCleanup = this.storage.close();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Storage cleanup timeout')), 3000)
          );

          await Promise.race([storageCleanup, timeoutPromise]);
        } catch (error: any) {
          console.error(chalk.yellow('⚠️  Storage cleanup timed out or failed:'), error.message);
        }
      }

      if (this.verbose) {
        console.log(chalk.green('✓ Cleanup completed'));
      }

      console.log(chalk.blue('👋 Goodbye!'));
    } catch (error: any) {
      console.error(chalk.red('Error during cleanup:'), error.message);
    }
  }
}

// React component for the chat interface
const ChatInterface: React.FC<{
  agent: AIAgent;
  config: ChatToolsConfig;
  verbose: boolean;
}> = ({ agent, config, verbose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await agent.generate(message, {
        saveToHistory: true
      });

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return React.createElement(Layout, {
    children: [
      React.createElement(ChatView, {
        key: 'chat',
        messages,
        loading
      }),
      React.createElement(MessageInput, {
        key: 'input',
        value: inputValue,
        onChange: setInputValue,
        onSubmit: handleSubmit,
        placeholder: 'Type your message...',
        disabled: loading
      })
    ]
  });
};
