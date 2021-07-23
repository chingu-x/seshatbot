import { BetaAnalyticsDataClient } from '@google-analytics/data'

// Get Metrics from Google Analytics for a specific range of dates
const getMetricsByRange = async (startDate, endDate) => {
  const propertyId = `${ process.env.GA_PROPERTY_ID }`
  // `export GOOGLE_APPLICATION_CREDENTIALS=/Users/jim/Development/sandbox/src/gacredentials.json`
  const analyticsDataClient = new BetaAnalyticsDataClient()
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${ process.env.GA_PROPERTY_ID }`,
    dateRanges: [
      {
        startDate: '2020-10-01',
        endDate: 'today',
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
  console.log('I am here')
  await getMetricsByRange('2020-10-01', '2021-07-22')
}

export default extractGAMetrics