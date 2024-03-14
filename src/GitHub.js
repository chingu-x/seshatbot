import { Octokit } from 'octokit'

const getTeams = async (GITHUB_ORG, GITHUB_TOKEN, voyageTeams) => {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN
  })

  // Loop through each team in the `teams` array
  let githubTeams = []
  for (let team of voyageTeams) {
    const githubTeamName = team.voyage.concat('-', team.tier, '-team-', team.team_no)
    const githubTeam = await octokit.request(`GET /orgs/${ GITHUB_ORG }/teams/${ githubTeamName }/invitations`, {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    console.log('githubTeam.data', githubTeam.data)
    githubTeams.push(githubTeam)
  }

  return githubTeams
}

export { getTeams }