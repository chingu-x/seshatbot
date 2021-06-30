import Airtable from 'airtable'

// Retrieve the schedule for the specified Voyage
const getVoyageSchedule = async (voyageName, timestamp) => {
  return new Promise(async (resolve, reject) => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appfnDw1vdrDWJ4SB')
    const filter = "{Name} = \"" + voyageName.toUpperCase() + "\"";

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

      resolve({
        voyageName: records[0].get('Name'),
        startDt: records[0].get('Start Date'),
        endDt: records[0].get('End Date'),
        currentSprint: 1
      })
    })
  })
}

export default getVoyageSchedule