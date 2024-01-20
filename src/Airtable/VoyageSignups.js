import Airtable from 'airtable'

// Retrieve Voyage Metrics for the matching voyage name, team number, 
// sprint number, & Discord user name
const getVoyageSignup = async (voyageName, teamNo, discordName) => {
  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)
    const filter = "AND(" + 
        "{Voyage} = \"" + voyageName.toUpperCase() + "\", " + 
        "{Team No} = " + parseInt(teamNo) + ", " +
        "{Discord Name} = \"" + discordName + "\" " +
      ")"

    base('Voyage Signups').select({ 
      filterByFormula: filter,
      view: 'Most Recent Voyage Signups' 
    })
    .firstPage((err, records) => {
      if (err) { 
        console.error('getVoyageSignup - filter: ', filter)
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

// Update an exising Voyage Signup with current status and a status comment
const updateVoyageSignup = async (recordID, status, statusComment) => {

  return new Promise(async (resolve, reject) => {
    const startDt = new Date(sprintStartDt)
    const endDt = new Date(sprintEndDt)
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    base('Voyage Signups').update([
      {
        "id": recordID,
        "fields": {
          "Status": status,
          "Status Comment": statusComment
        }
      }
    ], (err, records) => {
      if (err) {
        console.error('Error:', err)
        reject(err)
      }

      if (records) {
        resolve(records[0].id)
      } else {
        resolve(null)
      }
    })
  })
}

export { getVoyageSignup, updateVoyageSignup }