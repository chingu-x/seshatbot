import { getAllVoyageMetrics } from './Airtable/VoyageMetrics.js'
import { getVoyageTeams } from './Airtable/VoyageTeamsort.js'
import { getPendingMembers } from './GitHub.js'

// Extract team message metrics from the Discord channels
const extractGitHubMetrics = async (environment) => {
  const { GITHUB_ORG, GITHUB_TOKEN, VOYAGE } = environment.getOperationalVars()

  // Retrieve the list of team members who are in pending status (haven't yet
  // joined their team by responding to the invitation email) 
  const voyageTeams = await getVoyageTeams(VOYAGE)
  const pendingMembers = await getPendingMembers(GITHUB_ORG, GITHUB_TOKEN, voyageTeams)
  console.log('pendingMembers: ', pendingMembers)

  // Update the Joined Github Team column in the Airtable Voyage Metrics table 
  // for any team members who haven't yet joined the GitHub team (aka Pending 
  // Members). In addition, update this column for anyone who was pending, but 
  // has since joined their team.
  const voyageMetrics = await getAllVoyageMetrics(VOYAGE)
  for (let voyager of voyageMetrics) {
    console.log('voyager: ', voyager)
  }
  
}

export default extractGitHubMetrics