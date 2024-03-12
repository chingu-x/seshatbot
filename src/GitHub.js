import { Octokit } from 'octokit'

const getVoyageTeams = async (GITHUB_ORG, GITHUB_TOKEN, VOYAGE) => {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN
  })

  const teams = await octokit.request(`GET /orgs/${ GITHUB_ORG }/teams`, {
    org: 'ORG',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

export { getVoyageTeams }