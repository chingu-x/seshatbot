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
    endDt: endDt.toString(),
  }
  while (sprint.no < 6) {
    sprint.no = sprint.no + 1
    startDt.setDate(startDt.getDate() + 7)
    sprint.startDt = startDt.toISOString().substring(0,10)
    endDt.setDate(endDt.getDate() + 7)
    sprint.endDt = endDt.toISOString().substring(0,10)
    sprintSchedule.push(Object.assign({}, sprint))
  }

  return sprintSchedule
}

//--------------------------------
// Voyage Schedule Table functions
//--------------------------------

// Retrieve the schedule for the specified Voyage
const getVoyageSchedule = async (voyageName) => {
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

      // console.log(`\ngetVoyageSchedule - voyageName: ${ voyageName } voyageStartDt: ${ voyageStartDt } voyageEndDt: ${ voyageEndDt } sprintSchedule: `, sprintSchedule)

      resolve({
        voyageName: records[0].get('Name'),
        startDt: voyageStartDt,
        endDt: voyageEndDt,
        sprintSchedule: sprintSchedule
      })
    })

  })
}

//--------------------------------
// Voyage Metrics Table functions
//--------------------------------

// Retrieve Voyage Metrics for the matching voyage name, team number, 
// sprint number, & Discord user name
const getVoyageMetric = async (voyageName, teamNo, sprintNo, discordID) => {
  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)
    const filter = "AND(" + 
        "{Name} = \"" + voyageName.toUpperCase() + "\", " + 
        "{Team No} = " + parseInt(teamNo) + ", " +
        "{Sprint No} = \"" + sprintNo + "\", " +
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

// Add a new Voyage Metric row to AirTable
const addVoyageMetric = async (voyageName, teamNo, tierName, 
  sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount) => {

  return new Promise(async (resolve, reject) => {
    const startDt = new Date(sprintStartDt)
    const endDt = new Date(sprintEndDt)
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    base('Voyage Metrics').create([
      {
        "fields": {
          "Name": voyageName.toUpperCase(),
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

// Update an exising Voyage Metric row to AirTable
const updateVoyageMetric = async (recordID, voyageName, teamNo, tierName, 
  sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount) => {

  return new Promise(async (resolve, reject) => {
    const startDt = new Date(sprintStartDt)
    const endDt = new Date(sprintEndDt)
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    base('Voyage Metrics').update([
      {
        "id": recordID,
        "fields": {
          "Name": voyageName.toUpperCase(),
          "Sprint No": sprintNo.toString(),
          "Sprint Start Dt": startDt.toISOString().substring(0,10),
          "Sprint End Dt": endDt.toISOString().substring(0,10),
          "Tier Name": tierName,
          "Team No": teamNo,
          "Team Channel Msg Count": messageCount,
          "Discord ID": discordID
        }
      }
    ], (err, records) => {
      if (err) {
        console.error('Error:', err)
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
    let recordID = await getVoyageMetric(voyageName, teamNo, sprintNo, discordID)

    // If no matching row is found in the table add a new row
    if (recordID === null) {
      const addResult = await addVoyageMetric(voyageName, teamNo, tierName, 
        sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount)
      resolve(addResult)
    } else {
      // If a matching row is found update it with the message count
      const updateResult = await updateVoyageMetric(recordID, voyageName, teamNo, tierName, 
        sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount)
      resolve(updateResult)
    }
  })
}

//--------------------------------
// Website Metrics Table functions
//--------------------------------

// Add or update website metrics for a date range. Individual metrics are 
// identified by start and end calendar date
const addUpdateWebsiteMetrics = async (metricStartDate, metricEndDate, pageVisitCount, applyClickCount, applicationFormCount) => {
  
  return new Promise(async (resolve, reject) => {
    let recordID = await getWebsiteMetric(metricStartDate, metricEndDate)

    // If no matching row is found in the table add a new row
    if (recordID === null) {
      const addResult = await addWebsiteMetric(metricStartDate, metricEndDate, 
        pageVisitCount, applyClickCount, applicationFormCount)
      resolve(addResult)
    } else {
      // If a matching row is found update it with the message count
      const updateResult = await updateWebsiteMetric(recordID, metricStartDate, 
        metricEndDate, pageVisitCount, applyClickCount, applicationFormCount)
      resolve(updateResult)
    }
  })
}

export { addUpdateTeamMetrics, addUpdateWebsiteMetrics, getVoyageSchedule }