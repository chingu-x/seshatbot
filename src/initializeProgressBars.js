import cliProgress from 'cli-progress'
import _colors from 'colors'

const initializeProgressBars = (voyageName, teamChannelNames) => {
  let overallProgress = new cliProgress.SingleBar({
    format: 'Progress: |' + _colors.brightGreen('{bar}') + '| {value}/{total} | {percentage}% | {duration} secs',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    clearOnComplete: false,
    hideCursor: true
  }, cliProgress.Presets.shades_classic)

  overallProgress.start(teamChannelNames.length, 0);

  return overallProgress
}

export default initializeProgressBars