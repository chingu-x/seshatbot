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
  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)

    const filter = 'AND(' +
      '{Voyage} = "' + voyage + '", ' +
      '{Team No.} = "' + teamNo + '"' +
    ')'
    /*
    const filter = 'AND(' +
      '{Voyage} = "' + voyage + '", ' +
      '{Team No.} = "' + teamNo + '", ' +
      '{Discord ID} = "' + discordUserId + '" ' +
    ')'
    */

    console.log(`\ngetVoyager - filter: ${ filter }`)
    
    const selectObj = base('Voyage Signups').select({ 
      fields:[
        'Email', 'Voyage', 'Team Name', 'Tier', 'Team No.', 'Discord Name', 
        'Discord ID', 'Role', 'Status', 'Status Comment'
      ],
      filterByFormula: filter,
      view: 'Teamsort - '.concat(voyage) 
    })
    selectObj.eachPage(async function page(records, fetchNextPage) {
      for (let record of records) {
        //console.log('...record: ', record)
        try {
          const atDiscordId = record.get('Discord ID')[0]
          //console.log('...atDiscordId: ', atDiscordId, ' typeof atDiscordId: ', typeof atDiscordId)
          //console.log('...discordUserId: ', discordUserId, ' typeof discordUserId: ', typeof discordUserId)
          if (atDiscordId.trim() === discordUserId.trim()) {
            console.log(`getVoyager - Voyage:${ voyage } team:${ teamNo } atDiscordId:${ atDiscordId } discordUserId:${ discordUserId.trim() }`)
            const tierName = record.get('Tier')
              .slice(0,6)
              .toLowerCase()
              .split(' ')
              .join('')
            resolve({ 
              signup_id: `${ record.id }`,
              email: `${ record.get('Email') }`,
              voyage: `${ record.get('Voyage') }`,
              team_name: `${ record.get('Team Name') }`,
              tier: `${ tierName }`,
              team_no: `${ record.get('Team No.') }`,
              discord_name: `${ record.get('Discord Name') }`,
              discord_id: `${ atDiscordId }`,
              role: `${ record.get('Role') }`,
              status: `${ record.get('Status')}`,
              status_comment: `${ record.get('Status Comment')}`
            })
          }
        }
        catch(error) {
          console.log('getVoyager - error: ', error)
          console.log(`getVoyager - Error retrieving discordUserId ${ discordUserId }`)
          reject(error)
        }
      }
      resolve(-1)
    }, function done(err) {
      if (err) { 
        console.error('getVoyageTeam - filter: ', filter)
        console.error(err) 
        reject(err) 
      }

      console.log(`getVoyager - Voyager not found - Voyage:${ voyage } team:${ teamNo } user:${ discordUserId }`)
      resolve(-1)
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

export { getVoyageTeam, getVoyager, updateVoyageStatus }