import { BetaAnalyticsDataClient } from '@google-analytics/data'

// Get Metrics from Google Analytics for a specific range of dates
const getMetricsByRange = async (startDate, endDate) => {
  const analyticsDataClient = new BetaAnalyticsDataClient()
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${ process.env.GA_PROPERTY_ID }`,
    dateRanges: [
      {
        startDate: startDate,
        endDate: endDate,
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
  await getMetricsByRange('2020-10-01', '2021-07-22')
}

export default extractGAMetrics