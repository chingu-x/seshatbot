import Airtable from 'airtable'

const getVoyageSchedule = async (voyageName, timestamp) => {

  const base = new Airtable({ apiKey: 'keyiO162I2wFa5gPq' }).base('appfnDw1vdrDWJ4SB')

  base('Schedules').select({ 
    filterByFormula: `AND({{ Name } = '${ voyageName }}', { { Type } = 'Voyage'})`,
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