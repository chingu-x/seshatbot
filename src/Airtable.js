import Airtable from 'airtable'

const getVoyageSchedule = async (voyageName, timestamp) => {

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appfnDw1vdrDWJ4SB')

  base('Schedules').select({ 
    fields: ['Name', 'Type', 'Start Date', 'End Date'],
    filterByFormula: '{ Name } = '.concat('"', voyageName, '"'),
    view: 'Schedules' 
  })
  .firstPage((err, records) => {
    if (err) { 
      console.error(err) 
      return 
    }
    records.forEach((record) => {
      console.log('Retrieved', record.get('Name'), record.get('Start Date'), record.get('End Date'))
    })
    console.log('records: ', records)
    return records
  })
}

export default getVoyageSchedule