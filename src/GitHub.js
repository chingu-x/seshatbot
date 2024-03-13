import { Octokit } from 'octokit'

const getVoyageTeams = async (GITHUB_ORG, GITHUB_TOKEN, VOYAGE, teams) => {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN
  })

  // Loop through each team in the `teams` array
  let voyageTeams = []
  for (let team of teams) {
    const teams = await octokit.request(`GET /orgs/${ GITHUB_ORG }/teams/${ teamName }`, {
      org: 'ORG',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
  }

  return voyageTeams
}

export { getVoyageTeams }