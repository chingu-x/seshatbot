import cliProgress from 'cli-progress'
import _colors from 'colors'

const initializeProgressBars = (voyageName, teamChannelNames, { includeDetailBars } = { includeDetailBars: true }) => {
  const DESC_MAX_LTH = 30
  let progressBars = []

  let overallProgress = new cliProgress.MultiBar({
    format: '{description} |' + _colors.brightGreen('{bar}') + '| {value}/{total} | {percentage}% | {duration} secs',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    clearOnComplete: false,
    hideCursor: true
  }, cliProgress.Presets.shades_classic)

  if (includeDetailBars) {
    progressBars[0] = overallProgress.create(teamChannelNames.length, 0)
    progressBars[0].update(0, { description: voyageName.padEnd(DESC_MAX_LTH+10, ' ') })
    
    for (let teamNo = 0; teamNo < teamChannelNames.length; ++teamNo) {
      progressBars[teamNo+1] = overallProgress.create(1, 0)
      progressBars[teamNo+1].update(0, { 
        description: 'Channel:  '.concat(teamChannelNames[teamNo].padEnd(DESC_MAX_LTH, ' '))
      })
    }
  }

  return { overallProgress, progressBars }
}

export default initializeProgressBars