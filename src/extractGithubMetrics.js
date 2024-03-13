import { getVoyageTeams } from './Airtable/VoyageTeamsort.js'
//import { getVoyageTeams } from './GitHub.js'

// Extract team message metrics from the Discord channels
const extractGitHubMetrics = async (environment) => {
  const { GITHUB_ORG, GITHUB_TOKEN, VOYAGE } = environment.getOperationalVars()

  // Retrieve the list of team members who are in pending status (haven't yet
  // joined their team by responding to the invitation email) 
  const voyageTeams = await getVoyageTeams(VOYAGE)
  console.log(`extractGitHubMetrics - VOYAGE: ${ VOYAGE } voyageTeams: `, voyageTeams)

  /*
  const teams = await getVoyageTeams(GITHUB_ORG, GITHUB_TOKEN, VOYAGE)
  console.log('teams: ', teams)
  */
}

export default extractGitHubMetrics