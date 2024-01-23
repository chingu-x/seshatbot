import Airtable from 'airtable'
import { getVoyagerDiscordId } from './Applications.js'

// Retrieve all voyagers for a specific Voyage
const getVoyageTeam = async (voyage, teamNo) => {
  return new Promise(async (resolve, reject) => {
    let voyagers = []

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    const filter = 'AND(' +
      '{Voyage} = "' + voyage + '", ' +
      '{Team No.} = "' + teamNo + '" ' +
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

// Retrieve a voyager for a specific Voyage and team
const getVoyager = async (voyage, teamNo, discordUserId) => {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

  const filter = 'AND(' +
    '{Voyage} = "' + voyage + '", ' +
    '{Team No.} = "' + teamNo + '", ' +
    '{Discord ID} = "' + discordUserId + '" ' +
  ')'

  console.log(`\ngetVoyager - filter: ${ filter }`)
  
  base('Voyage Signups').select({ 
    fields:[
      'Email', 'Voyage', 'Team Name', 'Tier', 'Team No.', 'Discord Name', 
      'Discord ID', 'Role', 'Status', 'Status Comment'
    ],
    filterByFormula: filter,
    view: 'Teamsort - '.concat(voyage) 
  })
  .firstPage(async function (error, records) {
    if (error) { 
      console.error(error)
      console.log('VoyageTeamsort error')
      return (-1)
    }

    for (let record of records) {
      console.log(`getVoyager - Voyage:${ voyage } team:${ teamNo } record.get('Discord ID'):${ record.get('Discord ID') } discordUserId:${ discordUserId }`)
      try {
        const tierName = record.get('Tier')
          .slice(0,6)
          .toLowerCase()
          .split(' ')
          .join('')
        return({ 
          signup_id: `${ record.id }`,
          email: `${ record.get('Email') }`,
          voyage: `${ record.get('Voyage') }`,
          team_name: `${ record.get('Team Name') }`,
          tier: `${ tierName }`,
          team_no: `${ record.get('Team No.') }`,
          discord_name: `${ record.get('Discord Name') }`,
          role: `${ record.get('Role') }`,
          status: `${ record.get('Status')}`,
          status_comment: `${ record.get('Status Comment')}`
        })
      }
      catch(error) {
        console.log(`getVoyager - Error retrieving voyagerDiscordId ${ discordDiscordId }`)
        return(-1)
      }
    }
    console.log(`getVoyager - Voyager not found - Voyage:${ voyage } team:${ teamNo } user:${ discordUserId }`)
    return(-1)
  })
}

// Retrieve Voyage Metrics for the matching voyage name, team number, 
// sprint number, & Discord user name
const getVoyageStatus = async (voyageName, teamNo, discordName) => {
  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)
    const filter = "AND(" + 
        "{Voyage} = \"" + voyageName.toUpperCase() + "\", " + 
        "{Team No} = " + parseInt(teamNo) + ", " +
        "{Discord Name} = \"" + discordName + "\" " +
      ")"

    base('Voyage Signups').select({ 
      filterByFormula: filter,
      view: 'Most Recent Voyage Signups' 
    })
    .firstPage((err, records) => {
      if (err) { 
        console.error('getVoyageSignup - filter: ', filter)
        console.error(err) 
        reject(err) 
      }

      // If the record is found return its id. Otherwise, return null if it's
      // not found
      for (let i = 0; i < records.length; ++i) {
        if (records.length > 0) {
          resolve(records[i].id)
        }
      }
      resolve(null)
    })
  })
}

// Update an exising Voyage Signup with current status and a status comment
const updateVoyageStatus = async (discordName, teamNo, status, statusComment) => {

  return new Promise(async (resolve, reject) => {
    const startDt = new Date(sprintStartDt)
    const endDt = new Date(sprintEndDt)
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    base('Voyage Signups').update([
      {
        "id": recordID,
        "fields": {
          "Status": status,
          "Status Comment": statusComment
        }
      }
    ], (err, records) => {
      if (err) {
        console.error('Error:', err)
        reject(err)
      }

      if (records) {
        resolve(records[0].id)
      } else {
        resolve(null)
      }
    })
  })
}

export { getVoyageTeam, getVoyager, getVoyageStatus, updateVoyageStatus }