import getVoyageSchedule from './Airtable.js'
import Discord from './Discord.js'
import initializeProgressBars from './initializeProgressBars.js'

let messageSummary = []

const getSprintInfo =  (sprintSchedule, messageTimestamp) => {
  for (let sprint of sprintSchedule) {
    const startDt = new Date(sprint.startDt)
    const endDt = new Date(sprint.endDt)
    if (messageTimestamp >= startDt && messageTimestamp <= endDt) {
      return { 
        sprintStartDt: sprint.startDt,
        sprintEndDt: sprint.endDt
      }
    }
  }
  throw new Error('Message timestamp outside Voyage boundaries')
}

// Extract the tier from the Discord channel name. Channel names must be
// formatted as `<tier-name>-team-<team-no>`
const getTierName = (channelName) => {
  const tierNameTranslations = [
    { animalName: 'Toucans', tierName: 'Tier 1'},
    { animalName: 'Geckos', tierName: 'Tier 2'},
    { animalName: 'Bears', tierName: 'Tier 3'},
  ]
  const tierNameIndex = tierNameTranslations.findIndex(translation => 
    translation.animalName.toLowerCase() === channelName.split('-')[0].toLowerCase()
  )
  return tierNameTranslations[tierNameIndex].tierName
}

// Extract the team number from the Discord channel name. Channel names must be
// formatted as `<tier-name>-team-<team-no>`
const getTeamNo = (channelName) => {
  return channelName.split('-')[2]
}

// Invoked as a callback from Discord.fetchAllMessages this fills in the
// `messageSummary` object for each voyage, team, sprint, and team member.
// TODO: Modify to create and push an object onto the messageSummary array
const summarizeMessages = async (voyageName, teamNo, message) => {
  return new Promise(async (resolve, reject) => {
    console.log('summarizeMessages - voyageName: ', voyageName, ' teamNo: ', teamNo, ' message: ', message)
    const discordUserID = message.author.username.concat('#',message.author.discriminator)
    if (messageSummary[teamNo].userMessages.has(discordUserID)) {
      const schedule = await getVoyageSchedule(voyageName, message.createdTimestamp)
      let userCount = messageSummary[teamNo].userMessages.get(discordUserID) + 1
      const { sprintStartDt, sprintEndDt } = getSprintInfo(
        schedule.sprintSchedule, message.createdTimestamp)
      messageSummary[teamNo].sprintStartDt = sprintStartDt
      messageSummary[teamNo].sprintEndDt = sprintEndDt
      messageSummary[teamNo].userMessages.set(discordUserID, userCount)
    } else {
      messageSummary[teamNo].userMessages.set(discordUserID, 1)
    }
    resolve()
  })
}

// Extract team message metrics from the Discord channels
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
        console.log('channel.name: ', channel.name)
        if (channel.type !== 'category') {
          // Retrieve all messages in the channel
          // TODO: Generate the following in summarizeMessages instead of here
          messageSummary[teamNo] = { 
            voyage: VOYAGE,
            sprintStartDt: null,
            sprintEndDt: null,
            tierName: getTierName(channel.name),
            teamNo: getTeamNo(channel.name),
            userMessages: new Map()
          }

          await discordIntf.fetchAllMessages(channel, VOYAGE, teamNo, summarizeMessages)

          console.log('messageSummary: ', messageSummary)

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