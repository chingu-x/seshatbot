import Airtable from 'airtable'

// Retrieve the a user's unique Discord Id by retrieving it from their
// Applications table row using their email address
const getVoyagerDiscordId = async (email) => {
  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE)

    const filter =  
        `{Email} = "${ email }"`

    base('Applications').select({ 
      filterByFormula: filter,
      view: 'Applications' 
    })
    .firstPage(async (err, records) => {
      if (err) { 
        console.error('filter: ', filter)
        console.error(err) 
        reject(null) 
      }

      // Return the user's Discord id
      try {
        const discordId = records[0].get('Discord ID')
        resolve(discordId)
      }
      catch(err) {
        resolve(null)
      }
    })
  })
}

// Retrieve the number of Applications for the matching starting & ending 
// date range
const getApplicationCountByDate = async (metricStartDate, metricEndDate) => {
  return new Promise(async (resolve, reject) => {
    let applicationCount = 0
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    const filter = "AND(" + 
        "IS_AFTER({Timestamp},DATETIME_PARSE(\"" + metricStartDate.slice(0,10) + "\",\"YYYY-MM-DD\")), " +
        "IS_BEFORE({Timestamp},DATETIME_PARSE(\"" + metricEndDate.slice(0,10) + "\",\"YYYY-MM-DD\")) " +  
      ")"

    base('Applications').select({ 
      filterByFormula: filter,
      view: 'Applications' 
    })
    .eachPage(async function page(records, fetchNextPage) {
      applicationCount += records.length
      
      // To fetch the next page of records, call 'fetchNextPage'.
      // If there are more records, 'page' will get called again.
      // If there are no more records, 'done' will get called.
      fetchNextPage()
    }, function done(err) {
      if (err) { 
        console.error('getVoyageTeam - filter: ', filter)
        console.error(err) 
        reject(err) 
      }
      resolve(applicationCount)
    })
    /*
    .firstPage((err, records) => {
      if (err) { 
        console.error('filter: ', filter)
        console.error(err) 
        reject(err) 
      }

      // Return the number of Applications submitted in this date range
      if (records !== null && records !== undefined) {
        console.log(`records.length: `, records.length)
        resolve(records.length)
      }
      resolve(0)
    })
    */
  })
}

export { getVoyagerDiscordId, getApplicationCountByDate }