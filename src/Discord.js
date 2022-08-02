import DiscordJS from 'discord.js'

export default class Discord {
  constructor(environment) {
    this.environment = environment
    this.isDebug = this.environment.isDebug()
    this.client = new DiscordJS.Client()

    // Since extraction occurs within the `client.on` block these promises are
    // returned to the extract/audit callers and resolved by calling 
    // `this.commandResolve()` when functions like `createVoyageChannels()` 
    // have completed.
    this.commandResolve = null
    this.commandReject = null
    this.commandPromise = new Promise((resolve, reject) => {
      this.commandResolve = resolve
      this.commandReject = reject
    })
  }

  // Fetch all messages from the selected Discord team channels.
  // Note that the `callback` routine is invoked for each message to
  // accumulate any desired metrics.
  async fetchAllMessages(channel, schedule, teamNo, callback, messageSummary) {
    let isMoreMessages = true
    let fetchOptions = { limit: 100 }
    try {
      do {
        const messages = await channel.messages.fetch(fetchOptions)
        if (messages.size > 0) {
          for (let [messageID, message] of messages) {
            callback(schedule, teamNo, message, messageSummary) // Invoke the callback function to process messages
          }
          fetchOptions = { limit: 100, before: messages.last().id }
        } else {
          isMoreMessages = false // Stop fetching messages for this channel
        }
      } while (isMoreMessages)
      return
    } catch (err) {
      console.log(err)
      throw new Error(`Error retrieving messages for channel: ${channel.name} ${err}`)
    }
  }

  // Get the team channels for the specified Voyage
  getChannelNames(guild, voyageName, categoryRegex, channelRegex) {
    //console.log('Discord.js getChannelNames - voyageName: ', voyageName, 
    //  ' categoryRegex: ', categoryRegex, ' channelRegex: ',channelRegex)
    // Locate the owning category name. 
    const category = guild.channels.cache.find(category => {
      /*
      if (category.type === 'category' && category.name.toUpperCase().substring(0,3) === voyageName.toUpperCase()) {
        console.log('Discord.js getChannelNames - category: ', category)
      }
      */
      return category.name.toUpperCase().substring(0,3) === voyageName.toUpperCase() && category.type === 'category' && category.name.toUpperCase().match(categoryRegex)
    })

    // Get the team channel names in this category. 
    // console.log('guild.channels.cache: ', guild.channels.cache)
    let teamChannels = category.children
    .reduce((channels, channel) => {
      const result = channel.name.match(channelRegex)
      if (result !== null) {
        channels.push(channel)
      }
      return channels
    }, [])
    .sort((a, b) => {
      // Sort in ascending team number sequence
      return parseInt(a.name.substr(a.name.length - 2)) >= parseInt(b.name.substr(b.name.length - 2)) 
        ? 1 
        : -1
    })
    
    return {category, teamChannels }
  }
  
  getDiscordClient() {
    return this.client
  }

}