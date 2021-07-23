import { Command } from 'commander'
const program = new Command();
import Environment from './src/Environment.js'
import extractDiscordMetrics from './src/extractDiscordMetrics.js'
import extractGAMetrics from './src/extractGAMetrics.js'

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
    console.log('- startDate: ', options.startDate)
    console.log('- intervalDays: ', options.intervalDays)
    console.log('- startDay: ', options.startDay)
  }
}

// Process a request to extract metrics for a specific Voyage from its
// team channels and add/update them in Airtable
program 
  .command('extract <source>')
  .description('Extract Voyage team metrics from team channels')
  .option('-d, --debug <debug>', 'Debug switch to add runtime info to console (YES/NO)')
  .option('-v, --voyage <name>', 'Voyage (e.g. "v31") to be selected')
  .option('-s, --startdate <isodate>', 'Starting date (e.g. 2021-06-27)')
  .option('-i, --intervaldays <nodays>', 'Collection interval days (e.g. 7 for one week)')
  .option('-n, --dow <dayofweek>', 'Starting day of the week (e.g. "SUNDAY")')
  .action(async (source, options, command) => {
    environment.setOperationalVars({
      debug: options.debug,
      voyage: options.voyage,
      startDate: options.startDate,
      intervalDays: options.intervalDays,
      startDay: options.startDay
    })

    debug = environment.isDebug()

    debug && consoleLogOptions(options)
    debug && console.log('\noperationalVars: ', environment.getOperationalVars())
    debug && environment.logEnvVars()
    
    try {
      if (command._name === 'extract' && source.toLowerCase() === 'discord') {
        await extractDiscordMetrics(environment)
      }
      if (command._name === 'extract' && source.toLowerCase() === 'analytics') {
        await extractGAMetrics(environment)
      }
      process.exit(0)
    }
    catch (err) {
      console.log(err)
      process.exit(0)
    }
  })

  program.parse(process.argv)
