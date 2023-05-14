/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
import { Octokit } from '@octokit/rest'
import axios from 'axios'
import dotenv from 'dotenv'
import { RANGE } from './range'

dotenv.config()

const gistId = process.env.GIST_ID
const githubToken = process.env.GH_TOKEN
const wakatimeApiKey = process.env.WAKATIME_API_KEY
const range: RANGE = RANGE.LAST_7_DAYS

if (!gistId || !githubToken || !wakatimeApiKey)
  throw new Error('Missing some args')

const wakatime = axios.create({
  baseURL: 'https://wakatime.com/api/v1/',
  // Base-64 encode the API Key
  // https://wakatime.com/developers#introduction
  headers: {
    Authorization: `Basic ${Buffer.from(wakatimeApiKey).toString('base64')}`,
  },
})

const octokit = new Octokit({ auth: `token ${githubToken}` })

const main = async() => {
  const stats = await getMyStats()
  await updateGist(stats)
}

const getMyStats = async() => {
  let wakatimeData
  try {
    const response = await wakatime.get(`users/current/stats/${range}`)
    wakatimeData = response.data
    wakatimeData.data.languages.forEach((item: any) => {
      console.log(`${item?.name}: ${item?.text}`)
    })
  } catch (error) {
    console.error(`Unable to get wakatime\n${error}`)
  }
  return wakatimeData
}

const updateGist = async(stats: any) => {
  let gist
  try {
    gist = await octokit.gists.get({ gist_id: gistId })
  } catch (error) {
    console.error(`Unable to get gist\n${error}`)
  }

  const lines: string[] = []
  for (let i = 0; i < Math.min(stats.data.languages.length, 4); i++) {
    const data = stats.data.languages[i]
    const { name, percent, text: time } = data

    const line = [
      name.padEnd(11),
      `${time.padStart(14)} `,
      unicodeProgressBar(percent + 15),
      `${String(percent.toFixed(1)).padStart(5)}%`,
    ]

    lines.push(line.join(' '))
  }

  try {
    // Get original filename to update that same file
    const filename: string = Object.keys(gist?.data.files || {})[0] || '*'
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: '📊 Weekly development breakdown',
          content: lines.join('\n') || 'No content.',
        },
      },
    })
  } catch (error) {
    console.error(`Unable to update gist\n${error}`)
  }
}

const bar_styles: string[] = [
  '▁▂▃▄▅▆▇█',
  '⣀⣄⣤⣦⣶⣷⣿',
  '⣀⣄⣆⣇⣧⣷⣿',
  '○◔◐◕⬤',
  '□◱◧▣■',
  '□◱▨▩■',
  '□◱▥▦■',
  '░▒▓█',
  '░█',
  '⬜⬛',
  '⬛⬜',
  '▱▰',
  '▭◼',
  '▯▮',
  '◯⬤',
  '⚪⚫',
]

const unicodeProgressBar = (p: any, style = 7, min_size = 20, max_size = 20) => {
  let d
  let full
  let m
  let middle
  let r
  let rest
  let x
  let min_delta = Number.POSITIVE_INFINITY
  const bar_style = bar_styles[style]
  const full_symbol = bar_style[bar_style.length - 1]
  const n = bar_style.length - 1
  if (p === 100) return full_symbol.repeat(max_size)

  p = p / 100
  for (let i = max_size; i >= min_size; i--) {
    x = p * i
    full = Math.floor(x)
    rest = x - full
    middle = Math.floor(rest * n)
    if (p !== 0 && full === 0 && middle === 0) middle = 1
    d = Math.abs(p - (full + middle / n) / i) * 100
    if (d < min_delta) {
      min_delta = d
      m = bar_style[middle]
      if (full === i) m = ''
      r = full_symbol.repeat(full) + m + bar_style[0].repeat(i - full - 1)
    }
  }
  return r
}

main()
