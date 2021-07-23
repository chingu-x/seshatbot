import { BetaAnalyticsDataClient } from '@google-analytics/data'

// Get Metrics from Google Analytics for a specific range of dates
const getMetricsByRange = async (startDate, endDate) => {
  console.log(`startDate: ${ startDate } endDate: ${ endDate }`)
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

  console.log('Report result:')
  response.rows.forEach(row => {
    console.log(row.dimensionValues[0], row.metricValues[0])
  })
}

// Extract Google Analytics metrics for the chingu.io website
const extractGAMetrics = async (environment) => {
  const { START_DATE, START_DAY, INTERVAL_DAYS } = environment.getOperationalVars()
  console.log(`START_DATE: ${ START_DATE } START_DAY: ${ START_DAY } INTERVAL_DAYS: ${ INTERVAL_DAYS }`)
  let startDate = new Date(START_DATE)
  let endDate = new Date(START_DATE)
  console.log(`startDate: ${ startDate.toISOString() } endDate: ${ endDate.toISOString() }`)
  endDate.setDate(startDate.getDate() + parseInt(INTERVAL_DAYS)-1)
  console.log(`startDate: ${ startDate.toISOString() } endDate: ${ endDate.toISOString() }`)
  await getMetricsByRange(startDate.toISOString().slice(0,10), endDate.toISOString().slice(0,10))
}

export default extractGAMetrics