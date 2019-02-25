import React from 'react'
import Dropzone from 'react-dropzone'
import FileSaver from 'file-saver'
import { ProgressIndicator } from 'office-ui-fabric-react/lib/ProgressIndicator'

import { parseFile } from './parsimony'

const overlayStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  padding: '2.5em 0',
  background: 'rgba(0,0,0,0.5)',
  textAlign: 'center',
  color: '#fff'
}

class App extends React.Component {
  constructor() {
    super()
    this.state = {
      files: [],
      progress: 0,
      langs: {}
    }
  }

  onDrop(files) {
    this.setState({ files, langs: {}, progress: 0 })
  }

  handleLangChange = e => {
    const lang = e.target.value
    this.setState(prevState => ({
      langs: {
        ...prevState.langs,
        [lang]: !prevState.langs[lang]
      }
    }))
  }

  render() {
    const { files, progress, langs, totalTermEntries } = this.state

    const fileList = files.map(file => (
      <li key={file.name}>
        {file.name} - {(file.size / 1024) * 1024} MB
      </li>
    ))

    const langList = Object.keys(langs).map(lang => {
      return (
        <label
          key={lang}
          style={{
            display: 'inline-block',
            margin: '5px',
            padding: '2px',
            border: '1px dashed grey'
          }}
        >
          <input
            type="checkbox"
            name="language"
            value={lang}
            key={lang + langs[lang]}
            checked={langs[lang]}
            onChange={this.handleLangChange}
          />
          {lang}
        </label>
      )
    })

    return (
      <Dropzone onDrop={this.onDrop.bind(this)}>
        {({ getRootProps, getInputProps, isDragActive, open }) => (
          <div
            {...getRootProps({ onClick: e => e.preventDefault() })}
            style={{
              position: 'absolute',
              bottom: 0,
              top: 0,
              left: 0,
              right: 0
            }}
          >
            <h1>Parsimony: Convert TBX to CSV</h1>
            <input {...getInputProps()} />
            <button type="button" onClick={() => open()}>
              Open File Dialog
            </button>
            {isDragActive && <div style={overlayStyle}>Drop files here</div>}
            <input
              value={totalTermEntries > 0 ? 'Parse' : 'Analyze'}
              type="submit"
              id="parse"
              disabled={files.length === 0}
              onClick={e => {
                e.preventDefault()
                startParse({
                  files,
                  languages: Object.keys(langs).filter(lang => langs[lang]),
                  onProgress: (progress, stats) => {
                    const langs = {}
                    Object.keys(stats.langCounts).forEach(
                      lang => (langs[lang] = false)
                    )
                    this.setState({ progress, ...stats, langs })
                  }
                })
              }}
            />
            <h2>Files</h2>
            <ul>{fileList}</ul>
            <h2>Languages</h2>
            <div>{langList}</div>
            <ProgressIndicator percentComplete={progress} />
            <pre>{JSON.stringify(this.state, null, '\t')}</pre>
          </div>
        )}
      </Dropzone>
    )
  }
}

function startParse({ files, languages = [], onProgress }) {
  const file = files[0]
  if (!file) return
  console.time('Parsing file')
  parseFile({
    file,
    languages,
    onProgress,
    onFinish: handleFinish
  })

  function handleFinish({ csvString, stats }) {
    console.timeEnd('Parsing file')
    console.log(csvString)

    // saving file
    const blob = new Blob([csvString], { type: 'text/plain;charset=utf-8' })
    const fileNameBase = file.name.split('.')[0]
    FileSaver.saveAs(blob, `_${fileNameBase}.csv`)
  }
}

export default App
