import dotenv from 'dotenv'
import FileOps from './FileOps.js'

export default class Environment {
  constructor() {
    this.operationalVars = {}
  }

  logEnvVars() {
    console.log('\nEnvironment Variables:')
    console.log('---------------------')
    console.log('- DEBUG: ', process.env.DEBUG)
    console.log('- GUILD_ID: ', process.env.GUILD_ID)
    console.log('- AIRTABLE_API_KEY: ', process.env.AIRTABLE_API_KEY)
    console.log('- AIRTABLE_BASE: ', process.env.AIRTABLE_BASE)
    console.log('- DISCORD_TOKEN: ', process.env.DISCORD_TOKEN)
    console.log('- VOYAGE: ', process.env.VOYAGE)
    console.log('- CATEGORY: ', process.env.CATEGORY)
    console.log('- CHANNEL: ', process.env.CHANNEL)
    console.log('- FIRST_DATE: ', process.env.FIRST_DATE)
    console.log('- LAST_DATE: ', process.env.LAST_DATE)
    console.log('- INTERVAL_DAYS: ', process.env.INTERVAL_DAYS)
    console.log('- START_DAY: ', process.env.START_DAY)

    return true
  }

  initDotEnv(path) {
    try {
      const pathToEnv = path ? path : `${ __dirname }`
      if (FileOps.validateDirPath(pathToEnv) !== 0) {
        throw new Error(`.env file not found in path - ${ pathToEnv }`)
      }
      const result = dotenv.config( { path: `${ pathToEnv }/.env`, silent: true } )
      if (result.error) {
        throw result.error
      }
    }
    catch (err) {
      throw err
    }
  }

  isDebug() {
    return this.operationalVars.DEBUG
  }

  getOperationalVars() {
    return this.operationalVars
  }

  setOperationalVars(options) {
    // Retrieve the current variable values from `.env` file
    let { DEBUG, GUILD_ID, AIRTABLE_API_KEY, AIRTABLE_BASE, DISCORD_TOKEN, 
      VOYAGE, CATEGORY, CHANNEL, FIRST_DATE, LAST_DATE, INTERVAL_DAYS, START_DAY} = process.env

    // Initialize `operationalVars` allowing command line parameter values
    // to override `.env` parameters
    const debugValue = options.debug ? options.debug : DEBUG
    this.operationalVars.DEBUG = debugValue.toUpperCase() === 'YES' ? true : false
    this.operationalVars.AIRTABLE_API_KEY = AIRTABLE_API_KEY
    this.operationalVars.AIRTABLE_BASE = AIRTABLE_BASE
    this.operationalVars.DISCORD_TOKEN = DISCORD_TOKEN
    this.operationalVars.GUILD_ID = GUILD_ID
    this.operationalVars.VOYAGE = options.voyage ? options.voyage : VOYAGE
    this.operationalVars.CATEGORY = CATEGORY
    this.operationalVars.CHANNEL = CHANNEL
    this.operationalVars.FIRST_DATE = options.firstDate ? options.firstDate : FIRST_DATE
    this.operationalVars.LAST_DATE = options.lastDate ? options.lastDate : LAST_DATE
    this.operationalVars.START_DAY = options.startDay ? options.startDay : START_DAY
    this.operationalVars.INTERVAL_DAYS = options.intervalDays ? options.intervalDays : INTERVAL_DAYS
  }
}
