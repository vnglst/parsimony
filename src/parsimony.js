import sax from 'sax'

// parser
const strict = true
const parser = sax.parser(strict)

// stats
const stats = {
  totalTermEntries: 0,
  writtenEntries: 0,
  langCounts: {}
}

// to csv
let currentEntry = null
let currentLang = null
let terms = {}
let readTermText = false
let csvString = ''
let selectedLanguages

const containsAllSelected = () => {
  if (selectedLanguages.length === 0) return false
  let hasAll = true
  selectedLanguages.forEach(lang => {
    if (!terms[lang]) hasAll = false
  })
  return hasAll
}

parser.onopentag = function(tag) {
  if (tag.name === 'termEntry') {
    if (currentEntry && containsAllSelected()) {
      stats.writtenEntries++
      csvString += `${currentEntry}, `
      selectedLanguages.forEach(l => (csvString += `${terms[l]}, `))
      csvString += `\n`
    }
    currentEntry = tag.attributes.id
    currentLang = null
    terms = {}

    // stats
    stats.totalTermEntries++
  }

  if (tag.name === 'langSet') {
    currentLang = tag.attributes['xml:lang']

    // stats
    const currentCount = stats.langCounts[currentLang]
    stats.langCounts[currentLang] =
      currentCount !== undefined ? currentCount + 1 : 1
  }

  if (tag.name === 'term' && currentLang) {
    readTermText = true
  }
}

parser.ontext = function(text) {
  if (readTermText) {
    try {
      const textWithEncoding = decodeURIComponent(escape(text))
      terms[currentLang] = textWithEncoding
    } catch (error) {
      console.error('decoding error', error, text)
      terms[currentLang] = text
    }
  }
  readTermText = false
}

// keep track of last piece when stream
let lastPiece = null

// stream file in chunks
export function parseFile({ file, languages, onProgress, onFinish }) {
  console.log('parsing languages', languages)
  selectedLanguages = languages
  const startTime = new Date()
  const fileSize = file.size
  const chunkSize = 1 * 1024 * 1024 // 1 MB
  let offset = 0
  let chunkReaderBlock = null

  chunkReaderBlock = (_offset, length, _file) => {
    var r = new FileReader()
    var blob = _file.slice(_offset, length + _offset)
    r.onload = readEventHandler
    r.onprogress = () => onProgress(offset / fileSize, stats)
    r.readAsBinaryString(blob)
  }

  const readEventHandler = evt => {
    if (evt.target.error) {
      console.error('Read error: ' + evt.target.error)
      return
    }

    offset += evt.target.result.length
    parseChunk(evt.target.result)

    // when parsing is complete
    if (offset >= fileSize) {
      parser.end()

      // calculate total process time
      const endTime = new Date()
      stats.processTime = endTime - startTime

      // update progress 1 last time
      onProgress(1, stats)

      // send results to callback
      onFinish({ csvString, stats })
      return
    }

    // of to the next chunk
    chunkReaderBlock(offset, chunkSize, file)
  }

  // now let's start the read with the first block
  chunkReaderBlock(offset, chunkSize, file)
}

function parseChunk(chunk) {
  const combinedChunk = (lastPiece !== null ? lastPiece : '') + chunk
  const indexLastTag = combinedChunk.lastIndexOf('>')
  const splitOnTagChunk = combinedChunk.substring(0, indexLastTag + 1)
  lastPiece = combinedChunk.substring(indexLastTag + 1)
  parser.write(splitOnTagChunk)
}
