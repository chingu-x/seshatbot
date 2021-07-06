import { addUpdateTeamMetrics, getVoyageSchedule } from './Airtable.js'
import Discord from './Discord.js'
import initializeProgressBars from './initializeProgressBars.js'

const getSprintInfo =  (sprintSchedule, messageTimestamp) => {
  let sprintNo = 0
  for (let sprint of sprintSchedule) {
    sprintNo = sprintNo + 1
    const startDt = new Date(sprint.startDt)
    const endDt = new Date(sprint.endDt)
    if (messageTimestamp >= startDt && messageTimestamp <= endDt) {
      return { 
        sprintNo: sprintNo,
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
  return parseInt(channelName.split('-')[2])
}

// Invoked as a callback from Discord.fetchAllMessages this fills in the
// `messageSummary` object for each voyage, team, sprint, and team member.
const summarizeMessages = async (voyageName, teamNo, message, messageSummary) => {
  return new Promise(async (resolve, reject) => {
    const discordUserID = message.author.username.concat('#',message.author.discriminator)
    const schedule = await getVoyageSchedule(voyageName, message.createdTimestamp)
    const { sprintNo, sprintStartDt, sprintEndDt } = getSprintInfo(
      schedule.sprintSchedule, message.createdTimestamp)

    try {
      messageSummary[teamNo][sprintNo].sprintStartDt = sprintStartDt
      messageSummary[teamNo][sprintNo].sprintEndDt = sprintEndDt

      for (let sprintIndex = 1; sprintIndex <= 6; ++sprintIndex) {
        if (messageSummary[teamNo][sprintIndex].teamNo === teamNo && messageSummary[teamNo][sprintIndex].sprintNo === sprintNo) {
          if (messageSummary[teamNo][sprintIndex].userMessages.has(discordUserID)) {
            let userCount = messageSummary[teamNo][sprintIndex].userMessages.get(discordUserID) + 1
            messageSummary[teamNo][sprintIndex].userMessages.set(discordUserID, userCount)
          } else {
            messageSummary[teamNo][sprintIndex].userMessages.set(discordUserID, 1)
          }
        }
      }
      resolve()
    } catch (err) {
      console.log(`extractDiscordMetrics - summarizeMessages: Error procesing teamNo: ${ teamNo } sprintNo: ${ sprintNo } messageSummary: `, messageSummary)
      console.log(err)
      reject(err)
    }
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
      let { overallProgress, progressBars } = initializeProgressBars(
        category.name,
        channelNames, 
        { includeDetailBars: true, includeCategory: true }
      )

      // Count the number of messages for each team member in each team channel
      let messageSummary = [[]] // Six sprints within any number of teams with the first cell in each being unused

      for (let channel of teamChannels) {
        if (channel.type !== 'category') {
          // Retrieve all messages in the channel. Start by creating a template
          // entry for each sprint for the current team that will be updated as
          // incoming messages are tallied.
          let teamNo = getTeamNo(channel.name)
          messageSummary.push([])
          for (let sprintNo = 0; sprintNo < 7; ++sprintNo) {
            messageSummary[teamNo].push({ 
              voyage: VOYAGE,
              teamNo: teamNo,
              sprintNo: sprintNo,
              sprintStartDt: null,
              sprintEndDt: null,
              tierName: getTierName(channel.name),
              userMessages: new Map()
            })
          }

          await discordIntf.fetchAllMessages(channel, VOYAGE, teamNo, summarizeMessages, messageSummary)
        }
      }

      // Add or update matching rows in Airtable
      let teamNo = 0
      for (let team of messageSummary) {
        for (let sprint of team) {
          for (let [discordID, messageCount] of sprint.userMessages) {          
            const result = await addUpdateTeamMetrics(sprint.voyage, 
              sprint.teamNo, sprint.tierName, 
              sprint.sprintNo, sprint.sprintStartDt, sprint.sprintEndDt, 
              discordID, messageCount)
          }
        }

        // Update the progress bar
        progressBars[0].increment(1)
        progressBars[teamNo].increment(1)
        teamNo += 1
      }

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