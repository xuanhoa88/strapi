#!/usr/bin/env node

const resolveCwd = require("resolve-cwd")
const { yellow } = require("chalk")
const { Command } = require("commander")

const program = new Command()

const getLocalScript =
  (name) =>
  (...args) => {
    const cmdPath = resolveCwd.silent(`${__dirname}/commands/${name}`)
    if (!cmdPath) {
      console.log(
        `Error loading the local ${yellow(
          name
        )} command. Strapi might not be installed in your "node_modules". You may need to run "npm install"`
      )
      process.exit(1)
    }

    const script = require(cmdPath)

    Promise.resolve()
      .then(() => script(...args))
      .catch((error) => {
        console.error(
          `Error while running command ${name}: ${error.message || error}`
        )
        process.exit(1)
      })
  }

// Initial program setup
program.storeOptionsAsProperties(false).allowUnknownOption(true)

program.helpOption("-h, --help", "Display help for command")
program.addHelpCommand("help [command]", "Display help for command")

// `$ strapi env`
program
  .command("env")
  .description("Set ENV in Strapi application")
  .action(getLocalScript("dotenv"))

// `$ strapi start`
program
  .command("start")
  .description("Start your Strapi application")
  .action(getLocalScript("start"))

// `$ strapi develop`
program
  .command("develop")
  .alias("dev")
  .option("--polling", "Watching file changes in network directories", false)
  .description("Start your application in development mode")
  .action(getLocalScript("develop"))

// `$ strapi generate:api`
program
  .command("generate:api <id> [attributes...]")
  .option("-a, --api <api>", "API name to generate the files in")
  .option("-c, --connection <connection>", "The name of the connection to use")
  .option("--draft-and-publish", "Enable draft/publish", false)
  .description("Generate a basic API")
  .action((id, attributes, cliArguments) => {
    cliArguments.attributes = attributes
    getLocalScript("generate")(id, cliArguments)
  })

// `$ strapi generate:policy`
program
  .command("generate:policy <id>")
  .option("-a, --api <api>", "API name")
  .option("-p, --plugin <api>", "plugin name")
  .description("Generate a policy for an API")
  .action(getLocalScript("generate"))

// `$ strapi generate:plugin`
program
  .command("generate:plugin <id>")
  .option("-n, --name <name>", "Plugin name")
  .description("Generate a Plugin")
  .action(getLocalScript("generate"))

program.parseAsync(process.argv)
