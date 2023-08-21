import Airtable from 'airtable'
import { getVoyagerDiscordId } from './Applications.js'

// Retrieve all voyagers for a specific Voyage
const getVoyageTeam = async (voyage, teamNo) => {
  return new Promise(async (resolve, reject) => {
    let voyagers = []

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    const filter = 'AND(' +
      '{Voyage} = "' + voyage + '", ' +
      '{Team No.} = "' + teamNo + '", ' +
      '{Role} != "Mentor"' +
    ')'
    
    base('Voyage Signups').select({ 
      fields:['Email', 'Voyage', 'Team Name', 'Tier', 'Team No.', 'Discord Name', 'Role'],
      filterByFormula: filter,
      view: 'Teamsort - '.concat(voyage) 
    })
    .eachPage(async function page(records, fetchNextPage) {
      let voyagerNo = 0
      for (let record of records) {
        const voyagerDiscordName = record.get('Discord Name').split('#')[0]
        // Since the Airtable API can't return the values from look up columns
        // the user's unique Discord Id must be retrieve from their Application
        // table row
        const voyagerEmail = record.get('Email')
        try {
          const voyagerDiscordId = await getVoyagerDiscordId(voyagerEmail)
          if (voyagerDiscordId) {
            voyagerNo = ++voyagerNo
            const tierName = record.get('Tier')
              .slice(0,6)
              .toLowerCase()
              .split(' ')
              .join('')
            voyagers.push({ 
              number: `${ voyagerNo }`,
              signup_id: `${ record.id }`,
              email: `${ record.get('Email') }`,
              voyage: `${ record.get('Voyage') }`,
              team_name: `${ record.get('Team Name') }`,
              tier: `${ tierName }`,
              team_no: `${ record.get('Team No.') }`,
              discord_name: `${ voyagerDiscordName }`,
              role: `${ record.get('Role') }`,
              discord_id: `${ voyagerDiscordId }`
            })
          }
        }
        catch(err) {
          console.log(`getVoyageTeam - Invalid voyagerDiscordId ${ voyagerDiscordId } for ${ voyagerEmail }`)
        }   
      }

      // To fetch the next page of records, call 'fetchNextPage'.
      // If there are more records, 'page' will get called again.
      // If there are no more records, 'done' will get called.
      fetchNextPage()
    }, function done(err) {
      if (err) { 
        console.error('getVoyageTeam - filter: ', filter)
        console.error(err) 
        reject(err) 
      }
      resolve(voyagers)
    })
  })
}

export { getVoyageTeam }