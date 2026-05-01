import React from 'react'

interface Props {
  text: string
}

const HighlightedText: React.FC<Props> = ({ text }) => {
  const parts = text.split(/(<mark>.*?<\/mark>)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
          return <mark key={i} style={{ background: '#ffd666', padding: '0 1px' }}>{part.slice(6, -7)}</mark>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default HighlightedText
