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
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)
    const filter = "AND(" + 
        "{Name} = \"" + voyageName.toUpperCase() + "\", " + 
        "{Team No} = " + parseInt(teamNo) + ", " +
        "{Sprint No} = " + parseInt(sprintNo) + ", " +
        "{Discord ID} = \"" + discordID + "\" " +
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

      // If the record is found return its id. Otherwise, return null if it's
      // not found
      for (let i = 0; i < records.length; ++i) {
        if (records.length > 0) {
          resolve(records[i].id)
        }
      }
      resolve(null)
    })
  })
}

// Retrieve Voyage Metrics for the matching voyage name, team number, 
// sprint number, & Discord user name
const addTeamMetric = async (voyageName, teamNo, tierName, 
  sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount) => {

  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    const startDt = new Date(sprintStartDt)
    const endDt = new Date(sprintEndDt)
    base('Voyage Metrics').create([
      {
        "fields": {
          "Name": voyageName,
          "Sprint No": sprintNo.toString(),
          "Sprint Start Dt": startDt.toISOString().substring(0,10),
          "Sprint End Dt": endDt.toISOString().substring(0,10),
          "Tier Name": tierName,
          "Team No": teamNo,
          "Team Channel Msg Count": messageCount,
          "Discord ID": discordID
      }
    }], (err, records) => {
      if (err) {
        console.error(err)
        reject(err)
      }
      resolve(records[0].id)
    })
  })
}

// Add or update metrics for a team member. Individual metrics are identified
// by voyage name, team number, tier name, sprint number, & the Discord user name
const addUpdateTeamMetrics = async (voyageName, teamNo, tierName, 
  sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount) => {
  
  return new Promise(async (resolve, reject) => {
    let result = await getVoyageMetric(voyageName, teamNo, sprintNo, discordID)
    console.log(`addUpdateTeamMetrics - result: `, result)
    // If no matching row is found in the table add a new row
    if (result === null) {
      console.log('addUpdateTeamMetrics - add new row')
      result = await addTeamMetric(voyageName, teamNo, tierName, 
        sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount)
      resolve(result)
    }

    // If a matching row is found update it with the message count
    console.log('addUpdateTeamMetrics - update row')
    result = await updateTeamMetric(voyageName, teamNo, tierName, 
      sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount)
    resolve(result)
  })
}

export { addUpdateTeamMetrics, getVoyageSchedule }