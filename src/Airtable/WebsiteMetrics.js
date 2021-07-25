import Airtable from 'airtable'

// Retrieve Website Metrics for the matching start & end date range
const getWebsiteMetric = async (metricStartDate, metricEndDate) => {
  return new Promise(async (resolve, reject) => {
    console.log(`...getWebsiteMetric - metricStartDate: ${ metricStartDate.slice(0,10) } metricEndDate: ${ metricEndDate.slice(0,10) }`)

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)
    const filter = "AND(" + 
        "IS_SAME({Start date},\"" + metricStartDate.slice(0,10) + "\"), " + 
        "IS_SAME({End date},\"" + metricEndDate.slice(0,10) + "\") " +
      ")"
    console.log(`filter: ${ filter }`)

    base('Website Metrics').select({ 
      filterByFormula: filter,
      view: 'Website Metrics' 
    })
    .firstPage((err, records) => {
      if (err) { 
        console.error('filter: ', filter)
        console.error(err) 
        reject(err) 
      }

      // If the record is found return its id. Otherwise, return null if it's
      // not found
      if (records !== null && records !== undefined) {
        for (let i = 0; i < records.length; ++i) {
          if (records.length > 0) {
            resolve(records[i].id)
          }
        }
      }
      console.log('...No matches found')
      resolve(null)
    })
  })
}

// Add a new Voyage Metric row to AirTable
const addWebsiteMetric = async (metricStartDate, metricEndDate, 
  pageVisitCount, applyClickCount, applicationFormCount) => {

  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    base('Website Metrics').create([
      {
        "fields": {
          "Start date": metricStartDate,
          "End date": metricEndDate,
          "Page Visit Count": parseInt(pageVisitCount),
          "Apply Click Count": parseInt(applyClickCount),
          "Application Form Count": parseInt(applicationFormCount)
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

// Update an exising Website Metric row to AirTable
const updateWebsiteMetric = async (recordID, metricStartDate, metricEndDate, 
  pageVisitCount, applyClickCount, applicationFormCount) => {

  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    base('Website Metrics').update([
      {
        "id": recordID,
        "fields": {
          "Start date": metricStartDate,
          "End date": metricEndDate,
          "Page Visit Count": pageVisitCount,
          "Apply Click Count": applyClickCount,
          "Application Form Count": applicationFormCount
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

// Add or update website metrics for a date range. Individual metrics are 
// identified by start and end calendar date
const addUpdateWebsiteMetrics = async (metricStartDate, metricEndDate, 
  pageVisitCount, applyClickCount, applicationFormCount) => {
  
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

export { getWebsiteMetric, addWebsiteMetric, addUpdateWebsiteMetrics }