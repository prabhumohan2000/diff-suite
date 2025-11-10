/*
 * PrettyJsonView
 * ---------------
 * Virtualized pretty JSON viewer built on react-window. It renders only the
 * visible lines for large JSON payloads.
 */

'use client'

import React, { useMemo } from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { Paper, useTheme } from '@mui/material'

// Simpler and 100% correct formatting: stringify then split into lines.
const jsonToPrettyLines = (value: any, indent = 2): string[] =>
  JSON.stringify(value, null, indent).split('\n')

export interface PrettyJsonViewProps {
  json: any
  height?: number
  rowHeight?: number
  className?: string
}

export default function PrettyJsonView({ json, height = 480, rowHeight = 20, className }: PrettyJsonViewProps) {
  const theme = useTheme()

  // Produce pretty lines from the canonical instance. We do this in useMemo so
  // the large work only occurs when the input reference changes.
  const lines = useMemo(() => jsonToPrettyLines(json), [json])

  const Row = ({ index, style }: ListChildComponentProps) => (
    <div style={style} className="font-mono text-xs whitespace-pre">
      {lines[index]}
    </div>
  )

  return (
    <Paper elevation={0} className={`glass-card dark:glass-card-dark p-2 ${className ?? ''}`} sx={{ height }}>
      <AutoSizer>
        {({ width, height }) => (
          <List height={height} width={width} itemCount={lines.length} itemSize={rowHeight} overscanCount={8}>
            {Row}
          </List>
        )}
      </AutoSizer>
    </Paper>
  )
}
