#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigLoader } from './config-loader.js';
import { ChatApp } from './app.js';
import { validateConfig } from './validation.js';

const program = new Command();

program
  .name('chat-tools')
  .description('Terminal chat assistant with AI integration')
  .version('0.1.0');

program
  .command('start')
  .description('Start the chat assistant')
  .option('-c, --config <path>', 'Configuration file path', './chat-tools.json')
  .option('-w, --working-dir <path>', 'Working directory', process.cwd())
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Starting Chat Tools...'));

      // Load configuration
      const configLoader = new ConfigLoader();
      const config = await configLoader.load(options.config);

      // Validate configuration
      const validationResult = validateConfig(config);
      if (!validationResult.success) {
        console.error(chalk.red('❌ Configuration validation failed:'));
        validationResult.errors.forEach(error => {
          console.error(chalk.red(`  • ${error}`));
        });
        process.exit(1);
      }

      console.log(chalk.green('✓ Configuration loaded successfully'));
      console.log(chalk.gray(`Agent: ${config.name}`));
      console.log(chalk.gray(`Model: ${config.ai.provider}/${config.ai.model}`));

      // Start the application
      const app = new ChatApp({
        config,
        workingDirectory: options.workingDir,
        verbose: options.verbose
      });

      await app.start();

    } catch (error: any) {
      console.error(chalk.red('❌ Failed to start:'), error.message);
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate configuration file')
  .option('-c, --config <path>', 'Configuration file path', './chat-tools.json')
  .action(async (options) => {
    try {
      const configLoader = new ConfigLoader();
      const config = await configLoader.load(options.config);

      const validationResult = validateConfig(config);

      if (validationResult.success) {
        console.log(chalk.green('✓ Configuration is valid'));
        console.log(chalk.gray(`Agent: ${config.name}`));
        console.log(chalk.gray(`Model: ${config.ai.provider}/${config.ai.model}`));
        console.log(chalk.gray(`Tools: ${config.tools.enabled.length} enabled`));
        console.log(chalk.gray(`MCP Servers: ${config.mcp.servers.length} configured`));
      } else {
        console.error(chalk.red('❌ Configuration validation failed:'));
        validationResult.errors.forEach(error => {
          console.error(chalk.red(`  • ${error}`));
        });
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to validate:'), error.message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new chat-tools configuration')
  .option('-o, --output <path>', 'Output file path', './chat-tools.json')
  .option('-t, --template <name>', 'Configuration template', 'general')
  .action(async (options) => {
    try {
      const configLoader = new ConfigLoader();
      await configLoader.createTemplate(options.template, options.output);

      console.log(chalk.green('✓ Configuration template created'));
      console.log(chalk.gray(`File: ${options.output}`));
      console.log(chalk.yellow('💡 Edit the configuration file and run "chat-tools validate" to check it'));
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to create template:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list-templates')
  .description('List available configuration templates')
  .action(() => {
    console.log(chalk.blue('📋 Available Templates:'));
    console.log(chalk.green('  • general') + chalk.gray(' - General purpose assistant'));
    console.log(chalk.green('  • dev') + chalk.gray(' - Development assistant with code tools'));
    console.log(chalk.green('  • shell') + chalk.gray(' - Shell scripting expert'));
    console.log();
    console.log(chalk.yellow('Usage: chat-tools init --template <name>'));
  });

// Error handling
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str))
});

program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed') {
    process.exit(0);
  } else if (err.code === 'commander.version') {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
