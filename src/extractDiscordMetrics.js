import Discord from './Discord.js'
import { addUpdateTeamMetrics } from './Airtable/VoyageMetrics.js'
import { getVoyageSchedule } from './Airtable/VoyageSchedule.js'
import initializeProgressBars from './initializeProgressBars.js'

const getSprintInfo = (sprintSchedule, messageTimestamp) => {
  let sprintNo = 0
  for (let sprint of sprintSchedule) {
    sprintNo = sprintNo + 1
    const timestamp = new Date(messageTimestamp).toISOString().substring(0,10)
    if (timestamp >= sprint.startDt && timestamp <= sprint.endDt) {
      return { 
        sprintNo: sprintNo,
        sprintStartDt: sprint.startDt,
        sprintEndDt: sprint.endDt
      }
    }
  }
  return null // Message posted outside Voyage start/end dates
}

// Extract the tier from the Discord channel name. Channel names must be
// formatted as `<tier-name>-team-<team-no>`
const getTierName = (channelName) => {
  const tierNameTranslations = [
    { animalName: 'Tier1', tierName: 'Tier 1'},
    { animalName: 'Tier2', tierName: 'Tier 2'},
    { animalName: 'Tier3', tierName: 'Tier 3'},
  ]
  const tierNameIndex = tierNameTranslations.findIndex(translation => 
    translation.animalName.toLowerCase() === channelName.split('-')[0].toLowerCase()
  )
  console.log(`channelName: ${ channelName } tierNameIndex: ${ tierNameIndex } .tierName: ${ tierNameTranslations[tierNameIndex].tierName }`)
  return tierNameTranslations[tierNameIndex].tierName
}

// Extract the team number from the Discord channel name. Channel names must be
// formatted as `<tier-name>-team-<team-no>`
const getTeamNo = (channelName) => {
  console.log(`channelName: ${ channelName } team no.: ${ channelName.split('-')[2] }`)
  return parseInt(channelName.split('-')[2])
}

// Invoked as a callback from Discord.fetchAllMessages this fills in the
// `messageSummary` object for each voyage, team, sprint, and team member.
const summarizeMessages = (schedule, teamNo, message, messageSummary) => {
  //return new Promise(async (resolve, reject) => {
    const discordUserID = message.author.username.concat('#',message.author.discriminator)
    const sprintInfo = getSprintInfo(
      schedule.sprintSchedule, message.createdTimestamp)
    if (sprintInfo !== null) {
      const { sprintNo, sprintStartDt, sprintEndDt } = sprintInfo
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
        //resolve()
        return
      } catch (err) {
        console.log(`extractDiscordMetrics - summarizeMessages: Error procesing teamNo: ${ teamNo } sprintNo: ${ sprintNo } messageSummary: `, messageSummary)
        console.log(err)
        //reject(err)
      }
    }
  //})
}

// Extract team message metrics from the Discord channels
const extractDiscordMetrics = async (environment) => {
  const discordIntf = new Discord(environment)
  const { DISCORD_TOKEN, GUILD_ID, VOYAGE, CATEGORY, CHANNEL } = environment.getOperationalVars()

  const client = discordIntf.getDiscordClient()
  await client.login(DISCORD_TOKEN)
  const guild = await client.guilds.fetch(GUILD_ID)

  try {
    client.on('ready', async () => {
      // Create a list of the team channels to be processed
      const teamChannels = discordIntf.getTeamChannels(guild, VOYAGE, CATEGORY, CHANNEL)

      // Set up the progress bars
      const channelNames = teamChannels.map((channelInfo) => channelInfo.channel.name)
      let overallProgress = initializeProgressBars('All Channels', channelNames)

      // Count the number of messages for each team member in each team channel
      let messageSummary = [[]] // Six sprints within any number of teams with the first cell in each being unused
      const schedule = await getVoyageSchedule(VOYAGE)

      for (let channelInfo of teamChannels) {
        const channel = channelInfo.channel
        if (channel.type !== 'category') {
          // Retrieve all messages in the channel. There is one row in the channel
          // messageSummary array for each team and within each row there is
          // an embedded array with one cell per Sprint.
          
          // Start by formatting the current team row with an entry for each 
          // sprint. Incoming messages will be tallied here.
          let teamNo = getTeamNo(channel.name)
          console.log(`teamNo: ${ teamNo }`)
          messageSummary.push([]) // Create a new row for the team
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

          await discordIntf.fetchAllMessages(channel, schedule, teamNo, summarizeMessages, messageSummary)
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
        overallProgress.increment()
        overallProgress.update(teamNo)
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
    console.error(`Error logging into Discord. Token: ${ DISCORD_TOKEN }`)
    console.error(err)
    overallProgress.stop()
    discordIntf.commandReject('fail')
  }
}

export default extractDiscordMetrics