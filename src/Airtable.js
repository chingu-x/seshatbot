import Airtable from 'airtable'

// Calculate the start & end dates of each Sprint
const calculateSprints = (voyageStartDt, voyageEndDt) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  let startDt = new Date(voyageStartDt.concat(' 00:00:00'))
  let endDt = new Date(voyageEndDt.concat(' 00:00:00'))

  if (daysOfWeek[startDt.getDay()] !== 'Monday') {
    console.log(`Voyage start date (${ startDt.toString() }) isn't a Monday`)
    throw new Error(`Voyage start date (${ startDt.toString() }) isn't a Monday`)
  }
  if (daysOfWeek[endDt.getDay()] !== 'Sunday') {
    console.log(`Voyage end date (${ endDt.toString() }) isn't a Sunday`)
    throw new Error(`Voyage end date (${ endDt.toString() }) isn't a Sunday`)
  }

  let sprintSchedule = []
  startDt.setDate(startDt.getDate() - 7)
  endDt = new Date(voyageStartDt.concat(' 00:00:00'))
  endDt.setDate(endDt.getDate() - 1)
  let sprint = { 
    no: 0,
    startDt: startDt.toString(),
    endDt: endDt.toString()
  }
  while (sprint.no < 6) {
    sprint.no = sprint.no + 1
    startDt.setDate(startDt.getDate() + 7)
    sprint.startDt = startDt.toString()
    endDt.setDate(endDt.getDate() + 7)
    sprint.endDt = endDt.toString()
    sprintSchedule.push(sprint)
  }

  return sprintSchedule
}

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

      const voyageStartDt = records[0].get('Start Date')
      const voyageEndDt = records[0].get('End Date')
      const sprintSchedule = calculateSprints(voyageStartDt, voyageEndDt)
      console.log('sprintSchedule: ', sprintSchedule)

      resolve({
        voyageName: records[0].get('Name'),
        startDt: voyageStartDt,
        endDt: voyageEndDt,
        currentSprint: 1,
        sprintSchedule: sprintSchedule
      })
    })
  })
}

export default getVoyageSchedule