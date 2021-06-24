import Discord from './Discord.js'
import initializeProgressBars from './initializeProgressBars.js'

const extractDiscordMetrics = async (environment, GUILD_ID, DISCORD_TOKEN, VOYAGE, CHANNEL) => {
  const discordIntf = new Discord(environment)

  const client = discordIntf.getDiscordClient()
  const guild = await client.guilds.fetch(GUILD_ID)

  try {
    client.on('ready', async () => {
      // Create a list of the team channels to be processed
      const teamChannelNames = discordIntf.getChannelNames(guild, VOYAGE, CHANNEL)
      let { overallProgress, progressBars } = initializeProgressBars(
        teamChannelNames, 
        { includeDetailBars: true, includeCategory: true }
      )

      // Count the number of messages for each team member in each team channel

      // Add or update matching rows in Airtable

      // Terminate processing
      overallProgress.stop()
      discordIntf.commandResolve('done')
    })
  }
  catch(err) {
    console.log(err)
    overallProgress.stop()
    await client.destroy() // Terminate this Discord bot
    discordIntf.commandReject('fail')
  }

  // Login to Discord
  try {
    await client.login(DISCORD_TOKEN)
    return discordIntf.commandPromise
  }
  catch (err) {
    console.error(`Error logging into Discord. Token: ${ process.env.DISCORD_TOKEN }`)
    console.error(err)
    overallProgress.stop()
    discordIntf.commandReject('fail')
  }
}

export default extractDiscordMetrics