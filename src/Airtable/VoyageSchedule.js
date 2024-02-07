import Airtable from 'airtable'
import { calculateSprints } from '../util/dates.js'

// Retrieve the schedule for the specified Voyage
const getVoyageSchedule = async (voyageName) => {
  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE)
    const filter = "{Name} = \"" + voyageName.toUpperCase() + "\""

    base('Schedules').select({ 
      fields: ['Name', 'Type', 'Start Date', 'End Date'],
      filterByFormula: filter,
      view: 'Schedules' 
    })
    .firstPage((err, records) => {
      if (err) { 
        console.error('filter: ', filter)
        console.error(err) 
        reject(err) 
      }

      const voyageStartDt = records[0].get('Start Date')
      const voyageEndDt = records[0].get('End Date')
      const sprintSchedule = calculateSprints(voyageStartDt, voyageEndDt)

      resolve({
        voyageName: records[0].get('Name'),
        startDt: voyageStartDt,
        endDt: voyageEndDt,
        sprintSchedule: sprintSchedule
      })
    })

  })
}

export { getVoyageSchedule }