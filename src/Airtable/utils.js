// Calculate the number of days between two dates
const noDaysBetween = (startDate, endDate) => {
  if (typeof startDate !== 'date') {
    throw new Error(`noDaysBetween - startDate is ${ typeof startDate }. Should be 'date'`)
  }
  if (typeof endDate !== 'date') {
    throw new Error(`noDaysBetween - endDate is ${ typeof endDate }. Should be 'date'`)
  }

  try {
    const difference = startDate.getTime() - endDate.getTime()
    const noDays = Math.ceil(difference / (1000 * 3600 * 24))
  }
  catch(error) {
    throw new Error(`noDaysBetween - Calculation error. startDate: ${ startdate } endDate: ${ endDate }`)
  }

  return noDays
}

// Add days to a date
const addDays = (theDate, days) => {
  return new Date(theDate.getTime() + days*24*60*60*1000);
}

// Subtract days to a date
const subtractDays = (theDate, days) => {
  return new Date(theDate.getTime() - days*24*60*60*1000);
}

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
    endDt: endDt.toString(),
  }
  while (sprint.no < 6) {
    sprint.no = sprint.no + 1
    startDt.setDate(startDt.getDate() + 7)
    sprint.startDt = startDt.toISOString().substring(0,10)
    endDt.setDate(endDt.getDate() + 7)
    sprint.endDt = endDt.toISOString().substring(0,10)
    sprintSchedule.push(Object.assign({}, sprint))
  }

  return sprintSchedule
}

export { noDaysBetween, addDays, subtractDays, calculateSprints }