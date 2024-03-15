import { getAllVoyageMetrics, updateGitHubMetric } from './Airtable/VoyageMetrics.js'
import { getVoyageTeams } from './Airtable/VoyageTeamsort.js'
import { getPendingMembers } from './GitHub.js'

// Extract team message metrics from the Discord channels
const extractGitHubMetrics = async (environment) => {
  console.time(`...Extract GitHub Metrics`)
  const { GITHUB_ORG, GITHUB_TOKEN, VOYAGE } = environment.getOperationalVars()

  // Retrieve the list of team members who are in pending status (haven't yet
  // joined their team by responding to the invitation email) 
  console.time(`...Retrieving Voyage Teams for ${ VOYAGE }...`)
  const voyageTeams = await getVoyageTeams(VOYAGE)
  console.timeEnd(`...Retrieving Voyage Teams for ${ VOYAGE }...`)
  console.time(`...Retrieving pending GitHub members...`)
  const pendingMembers = await getPendingMembers(GITHUB_ORG, GITHUB_TOKEN, voyageTeams)
  console.timeEnd(`...Retrieving pending GitHub members...`)

  // Update the Joined Github Team column in the Airtable Voyage Metrics table 
  // for any team members who haven't yet joined the GitHub team (aka Pending 
  // Members). In addition, update this column for anyone who was pending, but 
  // has since joined their team.
  console.time(`...Retrieving Voyage Metrics for ${ VOYAGE }...`)
  const voyageMetrics = await getAllVoyageMetrics(VOYAGE)
  console.timeEnd(`...Retrieving Voyage Metrics for ${ VOYAGE }...`)
  console.time(`...Updating pending GitHub statuses in Voyage Metrics...`)
  for (let voyager of voyageMetrics) {
    const isPendingMember = (voyager) => voyager.voyager_metric['Joined GitHub Team'] === 'Yes'
    const pendingMember = pendingMembers.findIndex(isPendingMember)
    if (pendingMember === -1) {
      await updateGitHubMetric(voyager.id, voyager.voyager_metric.Name, 
        voyager.voyager_metric['Team No'], voyager.voyager_metric['Sprint No'],
        voyager.voyager_metric['Discord Name'], 'Yes')
    } else {
      await updateGitHubMetric(voyager.id, voyager.voyager_metric.Name, 
        voyager.voyager_metric['Team No'], voyager.voyager_metric['Sprint No'],
        voyager.voyager_metric['Discord Name'], 'No')
    }
  }
  console.timeEnd(`...Updating pending GitHub statuses in Voyage Metrics...`)
  console.timeEnd(`Extract GitHub Metrics`)
}

export default extractGitHubMetrics