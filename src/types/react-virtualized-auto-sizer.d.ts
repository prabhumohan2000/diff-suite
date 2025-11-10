declare module 'react-virtualized-auto-sizer' {
  import * as React from 'react'

  export interface AutoSizerProps {
    children?: (props: { width: number; height: number }) => React.ReactNode
    defaultWidth?: number
    defaultHeight?: number
    onResize?: (params: { width: number; height: number }) => void
    style?: React.CSSProperties
    className?: string
  }

  const AutoSizer: React.ComponentType<AutoSizerProps>
  export default AutoSizer
}
