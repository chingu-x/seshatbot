import Airtable from 'airtable'

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
        console.error('getVoyageMetric - filter: ', filter)
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
  sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount, signupID) => {

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
          "Discord ID": discordID,
          "Voyage Signups Link": [signupID],
      }
    }], (err, records) => {
      if (err) {
        console.error(err)
        reject(err)
      }
      console.log(`discordID: ${ discordID } signupID: ${ signupID }`)
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
  sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount, signupID) => {
  
  return new Promise(async (resolve, reject) => {
    let recordID = await getVoyageMetric(voyageName, teamNo, sprintNo, discordID)

    // If no matching row is found in the table add a new row
    if (recordID === null) {
      const addResult = await addVoyageMetric(voyageName, teamNo, tierName, 
        sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount, signupID)
      resolve(addResult)
    } else {
      // If a matching row is found update it with the message count
      const updateResult = await updateVoyageMetric(recordID, voyageName, teamNo, tierName, 
        sprintNo, sprintStartDt, sprintEndDt, discordID, messageCount)
      resolve(updateResult)
    }
  })
}

export { getVoyageMetric,  addVoyageMetric, updateVoyageMetric, addUpdateTeamMetrics }