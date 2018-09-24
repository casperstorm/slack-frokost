var SlackBot = require('slackbots');
const cheerio = require('cheerio')
const fetch = require('node-fetch')
const JSON5 = require('json5')
const _ = require('lodash')
const translate = require('node-google-translate-skidz')

const dotenv = require("dotenv");
dotenv.config()

var endpoint = 'https://www.frokost.dk/vi-tilbyder/frokostordning/meyers-koekken/frokost/'
var bot = new SlackBot({
    token: process.env.SLACK_TOKEN,
    name: 'Chef'
})

bot.on('start', () => {
  var params = {
    icon_emoji: ':male-cook::skin-tone-2:'
  }
})

bot.on('message', async (data) => {
  var params = {
    icon_emoji: ':male-cook::skin-tone-2:'
  }

  if (data.type === 'message' && data.subtype !== 'bot_message') {
    if (data.text === 'chef help') {
      bot.postMessageToChannel('general', help(), params)
    }

    if (data.text === 'chef today') {
      const data = await fetchData()
      const week = _.find(data, (x) => x.currentWeek)
      const day = _.find(week.days, (x) => x.isCurrentDay)
      const formattedDay = await formatDay(day)

      bot.postMessageToChannel('general', formattedDay, params)
    }

    if (data.text === 'chef tomorrow') {
      const data = await fetchData()
      const week = _.find(data, (x) => x.currentWeek)
      const day = _.find(week.days, (x) => x.isCurrentDay)
      if (day.name === 'fredag') {
        bot.postMessageToChannel('general', "It's friday today. Derp.", params)
        return
      }
      const index = _.indexOf(week.days, day)
      const tomorrow = week.days[index+1]
      const formattedDay = await formatDay(tomorrow)
      bot.postMessageToChannel('general', formattedDay, params)
    }

    if (data.text === 'chef endpoint') {
      bot.postMessageToChannel('general', `Current endpoint: ${endpoint}`, params)
    }

    if (data.text.includes('chef endpoint update')) {
      const matches = data.text.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi)
      endpoint = matches[0]
      bot.postMessageToChannel('general', `Endpoint has been updated: ${endpoint}`, params)
    }
  }
})

const translation = async (text) => {
  return new Promise((resolve, reject) => {
    translate({
      text: text,
      source: 'dk',
      target: 'en'
    }, function(result) {
      resolve(result.translation)
    })
  })
}

const formatDay = async (day) => {
  var dishes = ''
  var regex = /<br\s*[\/]?>/gi;

  for (let d of day.dishes) {
    const headline = prettifyTitle(d.heading)
    const headlineTranslated = await translation(d.heading)
    const dish = d.text.replace(regex, "\n")
    const dishTranslated = await translation(dish)

    dishes += `*${headline}* _(${headlineTranslated})_`
    dishes += '\n'
    dishes += dish
    dishes += '\n'
    dishes += '\n'
    dishes += dishTranslated
    dishes += '\n'
    dishes += '\n'
  }

  return `*${day.displayDate.toUpperCase()}*\n\n${dishes}`
}

const fetchData = async () => {
  const response = await fetch(endpoint)
  const text = await response.text()
  const context = cheerio.load(text)
  const json = JSON5.parse(context('fr-kitchen-menus').attr('v-bind:menus'))

  return json
}

const prettifyTitle = (head) => {
  if (head.toLowerCase().includes('grøn')) {
    return `🥒 ${head}`
  }

  if (head.toLowerCase().includes('vegetar')) {
    return `🌱 ${head}`
  }

  if (head.toLowerCase().includes('kold')) {
    return `🥪 ${head}`
  }

  if (head.toLowerCase().includes('varm')) {
    return `🍝 ${head}`
  }

  if (head.toLowerCase().includes('brød')) {
    return `🥖 ${head}`
  }

  return head
}

const help = () => {
  return `Hello! I can do the following\n\`chef today\`  - todays menu\n\`chef tomorrow\`  - tomorrows menu\n\`chef endpoint\`  - display current endpoint\n\`chef endpoint update [endpoint]\`  - update current endpoint` 
}
