import Discord from './Discord.js'
import initializeProgressBars from './initializeProgressBars.js'

const extractDiscordMetrics = async (environment, GUILD_ID, DISCORD_TOKEN, VOYAGE, CATEGORY, CHANNEL) => {
  const ALL_TEAMS = 0
  const CATEGORY_NO = 1
  const discordIntf = new Discord(environment)

  const client = discordIntf.getDiscordClient()
  const guild = await client.guilds.fetch(GUILD_ID)

  try {
    client.on('ready', async () => {
      // Create a list of the team channels to be processed
      const { category, teamChannels } = discordIntf.getChannelNames(guild, CATEGORY, CHANNEL)

      // Set up the progress bars
      const channelNames = [ category.name ]
      teamChannels.forEach(channel => channelNames.push(channel.name))
      let { overallProgress, progressBars } = initializeProgressBars(
        channelNames, 
        { includeDetailBars: true, includeCategory: true }
      )

      // Count the number of messages for each team member in each team channel
      let teamNo = CATEGORY_NO
      for (let channel of teamChannels) {
        const allMessages = await channel.messages.fetch({limit: 100}, false, true)
        const summarizedMessages = allMessages.map(post => {
          // console.log('\n...post: ', post)
          return { createdTimestamp: post.createdTimestamp,  author: post.author.username, discriminator: post.author.discriminator }
        })
        console.log('...summarizedMessages: ', summarizedMessages)

        // Update the progress bar
        progressBars[teamNo+1].increment(1)
        progressBars[ALL_TEAMS].increment(1) 
        ++teamNo 
      }

      // Add or update matching rows in Airtable

      // Terminate processing
      progressBars[CATEGORY_NO].increment(1) 
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