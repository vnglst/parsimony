import React from 'react'
import FileSaver from 'file-saver'
import cheerio from 'cheerio'

let count = 0
let total = 0
let currentEntry = null
let currentLang = null
let currentNL = null
let currentDE = null
let result = ''

const parseLine = line => {
  let $ = cheerio.load(line, {
    xmlMode: true
  })
  const id = $('termEntry').attr('id')
  if (id) {
    if (currentEntry && currentNL && currentDE) {
      result += `${currentEntry}, ${currentNL}, ${currentDE}\n`
      count++
    }
    currentEntry = id
    currentLang = null
    currentNL = null
    currentDE = null
    total++
  }

  const lang = $('langSet').attr('xml:lang')
  if (lang) {
    currentLang = lang
  }

  const term = $('term').text()
  if (term && currentLang === 'nl') {
    currentNL = term
  }
  if (term && currentLang === 'de') {
    currentDE = term
  }
}

const App = () => {
  return (
    <input
      type="file"
      onChange={e => {
        const file = e.target.files[0]
        let soFar = null
        console.time('Parsing file')

        parseFile(
          file,
          part => {
            const lines = ((soFar != null ? soFar : '') + part).split(/\r?\n/)
            soFar = lines.pop()
            lines.forEach(line => {
              const lineWithEncoding = decodeURIComponent(escape(line))
              parseLine(lineWithEncoding)
            })
          },
          () => {
            // console.log('last line' + soFar)
            // console.log(result)
            console.log(`Written ${count} terms of total ${total} terms.`)
            const blob = new Blob([result], {
              type: 'text/plain;charset=utf-8'
            })
            FileSaver.saveAs(blob, 'result.txt')
            console.timeEnd('Parsing file')
          }
        )
      }}
    />
  )
}

function parseFile(file, callback, done) {
  var fileSize = file.size
  var chunkSize = 1 * 1024 * 1024 // 1 MB
  var offset = 0
  var chunkReaderBlock = null

  var readEventHandler = function(evt) {
    if (evt.target.error == null) {
      offset += evt.target.result.length
      console.log(Math.round((offset / fileSize) * 100) + '%')
      callback(evt.target.result) // callback for handling read chunk
    } else {
      console.log('Read error: ' + evt.target.error)
      return
    }
    if (offset >= fileSize) {
      console.log('Done reading file')
      done()
      return
    }

    // of to the next chunk
    chunkReaderBlock(offset, chunkSize, file)
  }

  chunkReaderBlock = function(_offset, length, _file) {
    var r = new FileReader()

    var blob = _file.slice(_offset, length + _offset)

    r.onload = readEventHandler
    r.readAsBinaryString(blob)
  }

  // now let's start the read with the first block
  chunkReaderBlock(offset, chunkSize, file)
}

export default App
