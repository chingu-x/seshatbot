import Discord from './Discord.js'
import { addUpdateTeamMetrics } from './Airtable/VoyageMetrics.js'
import { getVoyageSchedule } from './Airtable/VoyageSchedule.js'
import { getVoyageTeam, getVoyager, updateVoyagerStatus } from './Airtable/VoyageTeamsort.js'
import { 
  GUILD_TEXT, GUILD_FORUM, 
  ADMIN_IDS, 
  VOYAGER_INACTIVE_DAYS_THRESHOLD } from './util/constants.js'
import { noDaysBetween } from './util/dates.js'

let discordIntf

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
  return tierNameTranslations[tierNameIndex].tierName
}

// Extract the team number from the Discord channel name. Channel names must be
// formatted as `<tier-name>-team-<team-no>`
const getTeamNo = (channelName) => {
  return parseInt(channelName.split('-')[2])
}

// Return the map key value for a specific combination of Discord user name and 
// team number. Since the map key is an object this will be a reference. Also,
// since our map key is an object we need to convert the map keys to
// an array to search for the matching entry
const findMapKey = (discordUserName, teamNo, mostRecentUserMsgs) => {
  const mapKeys = mostRecentUserMsgs.keys()
  for (let key of mapKeys) {
    if (key.userName === discordUserName && key.teamNo === teamNo) {
      const entryKey = mostRecentUserMsgs.get(key)
      if (entryKey === undefined) {
        return undefined
      } 
      return entryKey
    }
  }
  return undefined
}

// Invoked as a callback from Discord.fetchAllMessages this fills in the
// `messageSummary` object for each voyage, team, sprint, and team member.
const summarizeMessages = async (schedule, teamNo, message, messageSummary, mostRecentUserMsgs) => {
  return new Promise(async (resolve, reject) => {
    const discordUserName = message.author.username
    if (ADMIN_IDS.includes(discordUserName.toLowerCase())) {
      resolve()
    }
    const sprintInfo = getSprintInfo(schedule.sprintSchedule, message.createdTimestamp)
    if (sprintInfo !== null) {
      const { sprintNo, sprintStartDt, sprintEndDt } = sprintInfo
      try {
        // Update the Map of users and their most recent message date to the
        // creation date of this message if it's after the date in the map. 
        const key = findMapKey(discordUserName, teamNo, mostRecentUserMsgs)
        if (key === undefined) {
          mostRecentUserMsgs.set({ userName: discordUserName, teamNo: teamNo, userId: message.author.id }, message.createdAt)
        } else {
          if (key.userName === discordUserName && key.teamNo === teamNo) {
            const mostRecentUserMsgDate = mostRecentUserMsgs.get(key)
            if (message.createdAt > mostRecentUserMsgDate) {
              mostRecentUserMsgs.set({ userName: discordUserName, teamNo: teamNo, userId: message.author.id }, message.createdAt)
            } 
          }
        }

        // Update the message summary
        messageSummary[teamNo][sprintNo].sprintStartDt = sprintStartDt
        messageSummary[teamNo][sprintNo].sprintEndDt = sprintEndDt
        for (let sprintIndex = 1; sprintIndex <= 6; ++sprintIndex) {
          if (messageSummary[teamNo][sprintIndex].teamNo === teamNo && messageSummary[teamNo][sprintIndex].sprintNo === sprintNo) {
            if (messageSummary[teamNo][sprintIndex].userMessages.has(discordUserName)) {
              let userCount = messageSummary[teamNo][sprintIndex].userMessages.get(discordUserName) + 1
              messageSummary[teamNo][sprintIndex].userMessages.set(discordUserName, userCount)
            } else {
              messageSummary[teamNo][sprintIndex].userMessages.set(discordUserName, 1)
            }
          }
        }
        // TODO: Remove this??? const summaryInfo = messageSummary[teamNo][sprintNo]
        resolve()
      } catch (error) {
        console.log(`extractDiscordMetrics - summarizeMessages: Error processing teamNo: ${ teamNo } sprintNo: ${ sprintNo }`)
        console.log(error)
        reject(error)
      }
    }
  })
}

// Add a userMessages entry for any team member who didn't post a
// message in a sprint & set the email address for all team members
const addAbsentUsers = async (schedule, teamNo, messageSummary, mostRecentUserMsgs) => {
  const teamMembers = await getVoyageTeam(schedule.voyageName, teamNo)

  let member
  let discordUser

  for (member of teamMembers) {
    try {
      discordUser = await discordIntf.getGuildUser(member.discord_id)
      
      // Add a entry to the most recent user messages map for this user
      const key = findMapKey(discordUser.user.username, teamNo, mostRecentUserMsgs)
      if (key === undefined) {
        mostRecentUserMsgs.set({ 
            userName: discordUser.user.username, 
            teamNo: teamNo, 
            userId: discordUser.user.id
          }, 0)
      } 

      for (let sprintIndex = 1; sprintIndex <= 6; ++sprintIndex) {
        // Add an entry for any team member who hasn't posted messages in this sprint
        if (!messageSummary[teamNo][sprintIndex].userMessages.has(discordUser.user.username)) {
          messageSummary[teamNo][sprintIndex].userMessages.set(discordUser.user.username, null)
        }
        // Add the email address to all team members
        messageSummary[teamNo][sprintIndex].userSignupIDs.set(discordUser.user.username, member.signup_id)
      }
    }
    catch(error) {
      console.log('\naddAbsentUsers error: ', error !== null ? error : 'unknown error')
      console.log(`\naddAbsentUsers - user: ${ discordUser.id }/${ discordUser.name } member: ${ member.tier }-${member.team_no} / ${ member.email } / ${ member.discord_name }`)
    }
  }
}

// Update the Voyagers status in the Voyage Signups table
const updateVoyagersStatus = async (voyageName, discordUserId, teamNo, noDays, status, statusComment) => {
  let newStatus = ''
  let newStatusComment = ''
  const currentDate = new Date()
  const currentISODate = currentDate.toISOString().substring(0,10)

  // Get the Voyage Signup matching the users Voyage name, Discord name, and 
  // team number. Return if the Voyage status is not `Active` or `Inactive`
  const voyager = await getVoyager(voyageName.toUpperCase(), teamNo, discordUserId)
  console.log('voyager: ', voyager)
  if (voyager === -1) {
    return
  }
  if (voyager.status !== 'Active' && voyager.status !== 'Inactive') {
    return
  }

  // Check to see if the Voyage has posted any messages in this Voyage
  if (noDays === -1 && voyager.status === 'Active') {
    newStatus = 'Inactive'
    newStatusComment = `${ formattedCurrentDate } - No team channel posts since start of Voyage`
      .concat(voyager.status_comment)
  }

  // If the users Voyage status is `Inactive` change it back to `Active` if
  // the number of days since their last post is < VOYAGER_INACTIVE_DAYS_THRESHOLD
  // and return
  if (voyager.status === 'Inactive' && noDays < VOYAGER_INACTIVE_DAYS_THRESHOLD) {
    newStatus = 'Active'
    newStatusComment = `${ currentISODate } - Member returned to Active status\n`
      .concat(voyager.status_comment)
  }

  // If the users Voyage status is `Active` change it to `Inactive` and
  // add the status comment if the number of days since their last post 
  // is >= VOYAGER_INACTIVE_DAYS_THRESHOLD
  if (voyager.status === 'Active' && noDays >= VOYAGER_INACTIVE_DAYS_THRESHOLD) {
    newStatus = 'Inactive'
    newStatusComment = `${ currentISODate } - Member inactive for ${ noDays } days. Moved to inactive status\n`
      .concat(voyager.status_comment)
  }

  // If the Voyagers status has changed update it in their Voyage Signups row
  if (newStatus !== '') {
    console.log(`updateVoyagerStatus - Updating user: ${ discordUserId } team: ${ teamNo } noDays: ${ noDays } status: ${ newStatus } comment: ${ newStatusComment }`)
    //await updateVoyagerStatus(voyager.signup_id, newStatus, newStatusComment)
  }
}

// Extract team message metrics from the Discord channels
const extractDiscordMetrics = async (environment) => {
  console.log('...Connecting to Discord...')
  discordIntf = new Discord(environment)
  const { DISCORD_TOKEN, GUILD_ID, VOYAGE, CATEGORY, CHANNEL } = environment.getOperationalVars()

  const client = discordIntf.getDiscordClient()
  await client.login(DISCORD_TOKEN)
  console.log('...Discord client established...')

  const guild = await client.guilds.fetch(GUILD_ID)
  discordIntf.setGuild(guild)
  console.log('...Connection to Discord established...')

  try {
    client.on('ready', async () => {
      // Create a list of the team channels to be processed
      console.log('...Preparing to get team channels...')
      const teamChannels = await discordIntf.getTeamChannels(VOYAGE, CATEGORY, CHANNEL)

      // Count the number of messages for each team member in each team channel
      let messageSummary = [[]] // Six sprints within any number of teams with the first cell in each being unused
      let mostRecentUserMsgs = new Map() // Map containing the date of the most recent message posted by each user
      const schedule = await getVoyageSchedule(VOYAGE)
      console.log('...Voyage schedule: ', schedule)
      let priorTeamNo = 1

      console.time('...fetchAllMessages')
      for (let channel of teamChannels) {
        // Retrieve all messages in the channel. There is one row in the channel
        // messageSummary array for each team and within each row there is
        // an embedded array with one cell per Sprint.
        
        // Start by formatting the current team row with an entry for each 
        // sprint. Incoming messages will be tallied here.
        let teamNo = getTeamNo(channel.name)
        const gapInTeamNos = teamNo - priorTeamNo

        if (gapInTeamNos === 0) {
          messageSummary.push([]) // Create a new row for the team
        } else {
          for (let i = priorTeamNo + 1; i <= teamNo; i++) {
            messageSummary.push([]) // Create a new row for the skipped team(s) and the current team
          }
        }

        for (let sprintNo = 0; sprintNo < 7; ++sprintNo) {
          messageSummary[teamNo].push({ 
            voyage: VOYAGE,
            teamNo: teamNo,
            sprintNo: sprintNo,
            sprintStartDt: null,
            sprintEndDt: null,
            tierName: getTierName(channel.name),
            teamChannelName: channel.name,
            userMessages: new Map(),
            userSignupIDs: new Map()
          })
        }
        priorTeamNo = teamNo

        if (channel.type === GUILD_TEXT) {
          await discordIntf.fetchAllMessages(channel, schedule, teamNo, 
            summarizeMessages, messageSummary, mostRecentUserMsgs)
        } else if (channel.type === GUILD_FORUM) {
          const threads = await channel.threads.fetch()
          const forumThreads = Array.from(threads.threads).map(thread => thread[1])
          for (let thread of forumThreads) {
            await discordIntf.fetchAllMessages(thread, schedule, teamNo, 
              summarizeMessages, messageSummary, mostRecentUserMsgs)
          }
        } else {
          console.log(`Skipping unsupported channel type - ${ channel.type } / ${ channel.id } / ${ channel.name }`)
          continue
        }
      }

      console.timeEnd('...fetchAllMessages')


      // Add an entry for users who haven't posted in their channel
      console.time('...addAbsentUsers')
      for (let channel of teamChannels) {
        if (channel.type !== 'category') {
          const teamNo = getTeamNo(channel.name)
          await addAbsentUsers(schedule, teamNo, messageSummary, mostRecentUserMsgs)
        }
      }
      console.log('\n')
      console.timeEnd('...addAbsentUsers')

      // Add or update matching rows in Airtable
      let teamNo = 0
      console.time('...Add/Update Voyage Metrics')
      for (let team of messageSummary) {
        for (let sprint of team) {
          for (let [discordName, messageCount] of sprint.userMessages) { 
            const userSignupID = sprint.userSignupIDs.get(discordName) 
            if (!ADMIN_IDS.includes(discordName.toLowerCase())) {
              if (sprint.sprintStartDt !== null) {
                const result = await addUpdateTeamMetrics(sprint.voyage, 
                  sprint.teamNo, sprint.tierName, 
                  sprint.sprintNo, sprint.sprintStartDt, sprint.sprintEndDt, 
                  discordName, messageCount, userSignupID )
              }
            }
          }
        }

        teamNo += 1
      }
      console.timeEnd('...Add/Update Voyage Metrics')

      // Update the Voyage Signups status for Voyagers who are not
      // actively communicating in their team channels
      console.time('...Updating Voyage Status...')

      // Calculate the number of days since the users last team channel post.
      const currentDate = new Date()

      for (let entry of mostRecentUserMsgs) { 
        /*
        let status = ''
        let statusComment =''
        */
        const [key, mostRecentMsgDate] = entry
        const msgDate = new Date(mostRecentMsgDate)
        let noDays = noDaysBetween(msgDate, currentDate)

        if (mostRecentMsgDate === null) {
          noDays = -1
        }

        await updateVoyagersStatus(VOYAGE, key.userId, key.teamNo, noDays)
      }

      console.timeEnd('...Updating Voyage Status...')

      // Terminate processing
      discordIntf.commandResolve('done')
    })
  }
  catch(err) {
    console.log(err)
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
    //overallProgress.stop()
    discordIntf.commandReject('fail')
  }
}

export default extractDiscordMetrics