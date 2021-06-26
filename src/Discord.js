import DiscordJS from 'discord.js'
import FileOps from './FileOps.js'

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

  async fetchAllMessages(channel, teamNo, callback) {
    return new Promise(async (resolve, reject) => {
      let isMoreMessages = true
      let fetchOptions = { limit: 100 }
      try {
        do {
          const messages = await channel.messages.fetch(fetchOptions)
          if (messages.size > 0) {
            messages.map((message) => {
              callback(teamNo, message) // Invoke the callback function to process messages
            })
            fetchOptions = { limit: 100, before: messages.last().id }
          } else {
            isMoreMessages = false // Stop fetching messages for this channel
          }
        } while (isMoreMessages)
      } catch (err) {
        return reject(`Error retrieving messages for channel: ${channel.name} ${err}`)
      }
      return resolve()
    })
  }

  // Get the team channels for the specified Voyage
  getChannelNames(guild, categoryRegex, channelRegex) {
    // Locate the owning category name. 
    const category = guild.channels.cache.find(category => 
      category.type === 'category' && category.name.match(categoryRegex)
    )

    // Get the team channel names in this category. 
    let teamChannels = category.children.reduce((channels, channel) => {
      const result = channel.name.match(channelRegex)
      if (result !== null) {
        channels.push(channel)
      }
      return channels
    }, [])
    
    return {category, teamChannels }
  }
  
  getDiscordClient() {
    return this.client
  }

}