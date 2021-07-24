import { BetaAnalyticsDataClient } from '@google-analytics/data'

// Get Metrics from Google Analytics for a specific range of dates
const getMetricsByRange = async (startDate, endDate) => {
  const analyticsDataClient = new BetaAnalyticsDataClient()
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${ process.env.GA_PROPERTY_ID }`,
    dateRanges: [
      {
        startDate: `${ startDate }`,
        endDate: `${ endDate }`,
      },
    ],
    dimensions: [
      {
        name: 'eventName',
      },
    ],
    metrics: [
      {
        name: 'eventCount',
      },
    ],
  })

  let viewCount = 0
  let applyCount = 0
  response.rows.forEach(row => {
    switch (row.dimensionValues[0].value) {
      case 'page_view':
        viewCount = row.metricValues[0].value
        break
      case 'apply':
        applyCount = row.metricValues[0].value
        break
    }
  })
  return { viewCount: viewCount, applyCount: applyCount }
}

const addDays = (theDate, days) => {
  return new Date(theDate.getTime() + days*24*60*60*1000);
}

// Extract Google Analytics metrics for the chingu.io website
const extractGAMetrics = async (environment) => {
  const { FIRST_DATE, LAST_DATE, INTERVAL_DAYS } = environment.getOperationalVars()
  let startDate = new Date(FIRST_DATE)
  let lastDate = new Date(LAST_DATE)
  let endDate = addDays(new Date(FIRST_DATE), 6)

  do {
    console.log(`startDate: ${ startDate.toISOString() } endDate: ${ endDate.toISOString() }`)
    const { viewCount, applyCount } = await getMetricsByRange(startDate.toISOString().slice(0,10), endDate.toISOString().slice(0,10))
    console.log(`...viewCount: ${ viewCount } applyCount: ${ applyCount }`) 
    startDate = addDays(new Date(endDate.toISOString()), 1)
    endDate = addDays(new Date(startDate.toISOString()), parseInt(INTERVAL_DAYS)-1)
  } while (endDate <= lastDate)

}

export default extractGAMetrics