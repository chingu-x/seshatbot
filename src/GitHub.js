import { Octokit } from 'octokit'

const getPendingMembers = async (GITHUB_ORG, GITHUB_TOKEN, voyageTeams) => {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN
  })

  let githubTeams = []
  for (let team of voyageTeams) {
    const githubTeamName = team.voyage.concat('-', team.tier, '-team-', team.team_no)
    const githubTeam = await octokit.request(`GET /orgs/${ GITHUB_ORG }/teams/${ githubTeamName }/invitations`, {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    if (githubTeam.data.length > 0) {
      githubTeams.push(githubTeam)
    }
  }

  return githubTeams
}

export { getPendingMembers }