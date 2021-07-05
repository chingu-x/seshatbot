import Airtable from 'airtable'

// Calculate the start & end dates of each Sprint
const calculateSprints = (voyageStartDt, voyageEndDt) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  let startDt = new Date(voyageStartDt.concat(' 00:00:00'))
  let endDt = new Date(voyageEndDt.concat(' 00:00:00'))

  if (daysOfWeek[startDt.getDay()] !== 'Monday') {
    console.log(`Voyage start date (${ startDt.toString() }) isn't a Monday`)
    throw new Error(`Voyage start date (${ startDt.toString() }) isn't a Monday`)
  }
  if (daysOfWeek[endDt.getDay()] !== 'Sunday') {
    console.log(`Voyage end date (${ endDt.toString() }) isn't a Sunday`)
    throw new Error(`Voyage end date (${ endDt.toString() }) isn't a Sunday`)
  }

  let sprintSchedule = []
  startDt.setDate(startDt.getDate() - 7)
  endDt = new Date(voyageStartDt.concat(' 00:00:00'))
  endDt.setDate(endDt.getDate() - 1)
  let sprint = { 
    no: 0,
    startDt: startDt.toString(),
    endDt: endDt.toString()
  }
  while (sprint.no < 6) {
    sprint.no = sprint.no + 1
    startDt.setDate(startDt.getDate() + 7)
    sprint.startDt = startDt.toString()
    endDt.setDate(endDt.getDate() + 7)
    sprint.endDt = endDt.toString()
    sprintSchedule.push(Object.assign({}, sprint))
  }

  return sprintSchedule
}

// Retrieve the schedule for the specified Voyage
const getVoyageSchedule = async (voyageName, timestamp) => {
  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)
    const filter = "{Name} = \"" + voyageName.toUpperCase() + "\""

    base('Schedules').select({ 
      fields: ['Name', 'Type', 'Start Date', 'End Date'],
      filterByFormula: filter,
      view: 'Schedules' 
    })
    .firstPage((err, records) => {
      if (err) { 
        console.error('filter: ', filter)
        console.error(err) 
        reject(err) 
      }

      const voyageStartDt = records[0].get('Start Date')
      const voyageEndDt = records[0].get('End Date')
      const sprintSchedule = calculateSprints(voyageStartDt, voyageEndDt)

      resolve({
        voyageName: records[0].get('Name'),
        startDt: voyageStartDt,
        endDt: voyageEndDt,
        sprintSchedule: sprintSchedule
      })
    })

  })
}

// Retrieve Voyage Metrics for the matching voyage name, team number, 
// sprint number, & Discord user name
const getVoyageMetric = async (voyageName, teamNo, sprintNo, discordID) => {
  return new Promise(async (resolve, reject) => {
    let atVoyageName, atTeamNo, atTierName, atSprintNo, atDiscordID, atMsgCount
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)
    //const filter = "AND({Name} = \"" + voyageName.toUpperCase() + "\", {Team No} = " + parseInt(teamNo) + ")"
    const filter = "AND(" + 
        "{Name} = \"" + voyageName.toUpperCase() + "\", " + 
        "{Team No} = " + parseInt(teamNo) + 
      ")"

    base('Voyage Metrics').select({ 
      filterByFormula: filter,
      view: 'Voyage Metrics' 
    })
    .firstPage((err, records) => {
      if (err) { 
        console.error('filter: ', filter)
        console.error(err) 
        reject(err) 
      }

      console.log('records.length: ', records.length)
      for (let i = 0; i < records.length; ++i) {
        if (records.length > 0) {
          atVoyageName = records[i].get('Name')
          atTeamNo = records[i].get('Team No')
          atSprintNo = parseInt(records[i].get('Sprint No'))
          atDiscordID = records[i].get('Discord ID')
          atMsgCount = records[i].get('Team Channel Msg Count')
          console.log(`...input record    - ${ atVoyageName } / ${ atTeamNo } / ${ atSprintNo } / ${ atDiscordID }`)
          console.log('...sprintNo: ', sprintNo, ' ', typeof sprintNo,' discordID: ', discordID)

          if (atSprintNo === sprintNo && atDiscordID === discordID) {
            console.log(`...matching record - ${ atVoyageName } / ${ atTeamNo } / ${ atSprintNo } / ${ atDiscordID }`)
            resolve({
              atVoyageName,
              atTeamNo,
              atSprintNo,
              atDiscordID,
              atMsgCount
            })
          }
        }
      }
      resolve('No matching records')
    })
  })
}

// Add or update metrics for a team member. Individual metrics are identified
// by voyage name, team number, tier name, sprint number, & the Discord user name
const addUpdateTeamMetrics = async (voyageName, teamNo, tierName, 
  sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount) => {
  
  return new Promise(async (resolve, reject) => {
    // If a matching row is found in the table replace it's message count with
    // the new one
    const result = await getVoyageMetric(voyageName, teamNo, sprintNo, discordID)
    console.log(`addUpdateTeamMetrics - result: `, result)

    // If no matching row is found add a new one

    resolve()
  })
}

export { addUpdateTeamMetrics, getVoyageSchedule }