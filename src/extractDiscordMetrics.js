import getVoyageSchedule from './Airtable.js'
import Discord from './Discord.js'
import initializeProgressBars from './initializeProgressBars.js'

let messageSummary = []

const getSprintStartDt = async (voyageName, messageTimestamp) => {
  await getVoyageSchedule(voyageName, messageTimestamp)
}

const getSprintEndDt = (voyageName, messageTimestamp) => {}

const getTierName = (channelName) => {};

const getTeamNo = (channelName) => {}

const summarizeMessages = (voyageName, teamNo, message) => {
  console.log('message: ', message.createdTimestamp)
  const discordUserID = message.author.username.concat('#',message.author.discriminator)
  if (messageSummary[teamNo].userMessages.has(discordUserID)) {
    let userCount = messageSummary[teamNo].userMessages.get(discordUserID) + 1
    messageSummary[teamNo].sprintStartDt = getSprintStartDt(voyageName, message.createdTimestamp)
    messageSummary[teamNo].sprintEndDt = getSprintEndDt(voyageName, message.createdTimestamp)
    messageSummary[teamNo].userMessages.set(discordUserID, userCount)
  } else {
    messageSummary[teamNo].userMessages.set(discordUserID, 1)
  }
}

const extractDiscordMetrics = async (environment, GUILD_ID, DISCORD_TOKEN, VOYAGE, CATEGORY, CHANNEL) => {
  const discordIntf = new Discord(environment)

  const client = discordIntf.getDiscordClient()
  const guild = await client.guilds.fetch(GUILD_ID)

  try {
    client.on('ready', async () => {
      // Create a list of the team channels to be processed
      const { category, teamChannels } = discordIntf.getChannelNames(guild, CATEGORY, CHANNEL)

      // Set up the progress bars
      const channelNames = [category.name]

      teamChannels.forEach(channel => channelNames.push(channel.name))
      /*
      let { overallProgress, progressBars } = initializeProgressBars(
        category.name,
        channelNames, 
        { includeDetailBars: true, includeCategory: true }
      )
      */

      // Count the number of messages for each team member in each team channel
      let teamNo = 1
      for (let channel of teamChannels) {
        if (channel.type !== 'category') {
          // Retrieve all messages in the channel
          messageSummary[teamNo] = { 
            voyage: VOYAGE,
            sprintStartDt: null,
            sprintEndDt: null,
            tierName: getTierName(channel.name),
            teamNo: getTeamNo(channel.name),
            userMessages: new Map()
          }

          await discordIntf.fetchAllMessages(channel, VOYAGE, teamNo, summarizeMessages)

          // Update the progress bar
          //progressBars[0].increment(1)
          //progressBars[teamNo].increment(1)
          ++teamNo 
        }
      }

      // Add or update matching rows in Airtable

      // Terminate processing
      //overallProgress.stop()
      //console.log('\nmessageSummary: ', messageSummary)
      discordIntf.commandResolve('done')
    })
  }
  catch(err) {
    console.log(err)
    //overallProgress.stop()
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
    //overallProgress.stop()
    discordIntf.commandReject('fail')
  }
}

export default extractDiscordMetrics