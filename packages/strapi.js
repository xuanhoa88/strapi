#!/usr/bin/env node

const resolveCwd = require('resolve-cwd')
const { yellow } = require('chalk')
const { Command } = require('commander')

const program = new Command()

const getLocalScript =
  (name) =>
  (...args) => {
    const cmdPath = resolveCwd.silent(`${__dirname}/strapi/commands/${name}`)
    if (!cmdPath) {
      console.log(
        `Error loading the local ${yellow(
          name
        )} command. Strapi might not be installed in your "node_modules". You may need to run "npm install"`
      )
      process.exit(1)
    }

    const done = require(cmdPath)

    Promise.resolve()
      .then(() => done(...args))
      .catch((error) => {
        console.error(
          `Error while running command ${name}: ${error.message || error}`
        )
        process.exit(1)
      })
  }

// Initial program setup
program.storeOptionsAsProperties(false).allowUnknownOption(true)

program.helpOption('-h, --help', 'Display help for command')
program.addHelpCommand('help [command]', 'Display help for command')

// `$ strapi env:update`
program
  .command('env:update')
  .description('Set ENV in Strapi application')
  .action(getLocalScript('dotenv'))

// `$ strapi production`
program
  .command('production')
  .option('-f, --ini-file <iniFile>', 'INI configuration file')
  .description('Start your Strapi application')
  .action(getLocalScript('production'))

// `$ strapi develop`
program
  .command('develop')
  .option('-f, --ini-file <iniFile>', 'INI configuration file')
  .option('--polling', 'Watching file changes in network directories', false)
  .description('Start your application in development mode')
  .action(getLocalScript('develop'))

// `$ strapi generate:api`
program
  .command('generate:api <id> [attributes...]')
  .option('-c, --connection <connection>', 'The name of the connection to use')
  .description('Generate a basic API')
  .action((id, attributes, cliArguments) => {
    cliArguments.attributes = attributes
    getLocalScript('generate')(id, cliArguments)
  })

// `$ strapi generate:policy`
program
  .command('generate:policy <id>')
  .option('-a, --api <api>', 'API name')
  .option('-p, --plugin <api>', 'plugin name')
  .description('Generate a policy for an API')
  .action(getLocalScript('generate'))

// `$ strapi generate:plugin`
program
  .command('generate:plugin <id>')
  .option('-n, --name <name>', 'Plugin name')
  .description('Generate a Plugin')
  .action(getLocalScript('generate'))

// `$ strapi generate:helper`
program
  .command('generate:helper <id>')
  .option('-n, --name <name>', 'Helper name')
  .description('Generate a Helper')
  .action(getLocalScript('generate'))

// `$ strapi migrate`
program
  .command('migrate <id>')
  .description('knex migrations CLI')
  .action(getLocalScript('database/migrate'))

// `$ strapi seed`
program
  .command('seed <id>')
  .description('knex seed CLI')
  .action(getLocalScript('database/seed'))

program.parseAsync(process.argv)
