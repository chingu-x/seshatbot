import Discord from './Discord.js'
import { getVoyageTeams } from './GitHub.js'

// Extract team message metrics from the Discord channels
const extractGitHubMetrics = async (environment) => {
  const { GITHUB_ORG, GITHUB_TOKEN, VOYAGE } = environment.getOperationalVars()

  const teams = await getVoyageTeams(GITHUB_ORG, GITHUB_TOKEN, VOYAGE)
  console.log('teams: ', teams)
}

export default extractGitHubMetrics