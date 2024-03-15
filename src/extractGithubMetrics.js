import { getAllVoyageMetrics, updateGitHubMetric } from './Airtable/VoyageMetrics.js'
import { getVoyageTeams } from './Airtable/VoyageTeamsort.js'
import { getPendingMembers } from './GitHub.js'

// Extract team message metrics from the Discord channels
const extractGitHubMetrics = async (environment) => {
  const { GITHUB_ORG, GITHUB_TOKEN, VOYAGE } = environment.getOperationalVars()

  // Retrieve the list of team members who are in pending status (haven't yet
  // joined their team by responding to the invitation email) 
  const voyageTeams = await getVoyageTeams(VOYAGE)
  const pendingMembers = await getPendingMembers(GITHUB_ORG, GITHUB_TOKEN, voyageTeams)
  //console.log('pendingMembers: ', pendingMembers.length)

  // Update the Joined Github Team column in the Airtable Voyage Metrics table 
  // for any team members who haven't yet joined the GitHub team (aka Pending 
  // Members). In addition, update this column for anyone who was pending, but 
  // has since joined their team.
  const voyageMetrics = await getAllVoyageMetrics(VOYAGE)
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
}

export default extractGitHubMetrics