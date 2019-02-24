import React from 'react'
import FileSaver from 'file-saver'
import sax from 'sax'

// counts
let openedTermEntries = 0
let closedTermEntries = 0
let totalTermEntries = 0
let langCounts = {}

// for csv
let currentEntry = null
let currentLang = null
let currentNL = null
let currentDE = null
let result = ''

var strict = true
var parser = sax.parser(strict)

parser.onopentag = function(tag) {
  if (tag.name === 'termEntry') openedTermEntries++
  if (tag.name === 'langSet') {
    const lang = tag.attributes['xml:lang']
    const currentCount = langCounts[lang]
    langCounts[lang] = currentCount !== undefined ? currentCount + 1 : 0
  }
}

parser.onclosetag = function(tag) {
  if (tag === 'termEntry') closedTermEntries++
}

// parser.ontext = function(text) {
//   const textWithEncoding = decodeURIComponent(escape(text))
//   console.log(textWithEncoding)
// }

const parseLine = line => {
  parser.write(line)
  const termEntryCount = line.split('<termEntry').length - 1
  totalTermEntries += termEntryCount
}

const App = () => {
  return (
    <input
      type="file"
      onChange={e => {
        const file = e.target.files[0]
        let lastPiece = null
        console.time('Parsing file')

        parseFile(
          file,
          chunk => {
            // TODO: splitting chunks on newlines is not according to xml spec!
            const lines = ((lastPiece != null ? lastPiece : '') + chunk).split(
              /\r?\n/
            )
            lastPiece = lines.pop()
            lines.forEach(parseLine)
          },
          () => {
            console.log('last piece' + lastPiece)
            parser.end()
            console.log(
              `
              Opened/closed ${openedTermEntries}/${closedTermEntries} termEntries. 
              Expected: ${totalTermEntries}.
              Language counts:
              ${JSON.stringify(langCounts, null, 8)}
              `
            )
            // const blob = new Blob([result], {
            //   type: 'text/plain;charset=utf-8'
            // })
            // FileSaver.saveAs(blob, 'result.txt')
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
