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
      stats: {}
    }
  }

  onDrop(files) {
    this.setState({ files })
  }

  render() {
    const { files, progress, stats } = this.state
    const renderedFiles = files.map(file => (
      <li key={file.name}>
        {file.name} - {(file.size / 1024) * 1024} MB
      </li>
    ))

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
              value="Start parser!"
              type="submit"
              id="process"
              disabled={files.length === 0}
              onClick={e => {
                e.preventDefault()
                startParse(files, (progress, stats) => {
                  this.setState({ progress: progress / 100, stats })
                })
              }}
            />
            <h2>Files</h2>
            <ul>{renderedFiles}</ul>
            <ProgressIndicator label="Progress" percentComplete={progress} />
            <pre>{JSON.stringify(stats, null, '\t')}</pre>
          </div>
        )}
      </Dropzone>
    )
  }
}

function startParse(files, onProgress) {
  const file = files[0]
  if (!file) return
  console.time('Parsing file')
  parseFile({
    file,
    onProgress,
    onFinish: handleFinish
  })

  function handleFinish({ csvString, stats }) {
    console.timeEnd('Parsing file')
    console.log(stats)

    // saving file
    const blob = new Blob([csvString], { type: 'text/plain;charset=utf-8' })
    const fileNameBase = file.name.split('.')[0]
    FileSaver.saveAs(blob, `_${fileNameBase}.csv`)
  }
}

export default App
