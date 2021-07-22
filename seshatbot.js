import { Command } from 'commander'
const program = new Command();
import Environment from './src/Environment.js'
import extractDiscordMetrics from './src/extractDiscordMetrics.js'

const environment = new Environment()
environment.initDotEnv('./')
let debug = false

const consoleLogOptions = (options) => {
  if (environment.isDebug()) {
    console.log('\Seshatbot command options:')
    console.log('--------------------')
    console.log('- debug: ', options.debug)
    console.log('- guild id: ', options.guildID)
    console.log('- voyage: ', options.voyage)
    console.log('- category: ', options.category)
    console.log('- channel: ', options.channel)
  }
}

// Process a request to extract metrics for a specific Voyage from its
// team channels and add/update them in Airtable
program 
  .command('extract <source>')
  .description('Extract Voyage team metrics from team channels')
  .option('-d, --debug <debug>', 'Debug switch to add runtime info to console (YES/NO)')
  .option('-v, --voyage <name>', 'Voyage (e.g. "v31") to be selected')
  .option('-t, --category <regex-pattern>', 'Category name regex pattern (e.g. vd{2}-🔥$) to match on')
  .option('-c, --channel <regex-pattern>', 'Channel name regex pattern (e.g. [a-z]+-team-\d{2}$) to match on')
  .action(async (source, options, command) => {
    environment.setOperationalVars({
      debug: options.debug,
      voyage: options.voyage,
      channel: options.channel
    })

    debug = environment.isDebug()

    debug && consoleLogOptions(options)
    debug && console.log('\noperationalVars: ', environment.getOperationalVars())
    debug && environment.logEnvVars()

    const { GUILD_ID, AIRTABLE_API_KEY, DISCORD_TOKEN, VOYAGE, CATEGORY, CHANNEL } = environment.getOperationalVars()
    
    try {
      if (command._name === 'extract' && source.toLowerCase() === 'discord') {
        await extractDiscordMetrics(environment)
      }
      process.exit(0)
    }
    catch (err) {
      console.log(err)
      process.exit(0)
    }
  })

  program.parse(process.argv)
