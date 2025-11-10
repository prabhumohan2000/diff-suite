/*
 * useJsonWorker hook
 * -------------------
 * A small typed wrapper around a dedicated JSON Web Worker that
 * performs heavyweight operations (parse + diff) off the main thread.
 *
 * Goals addressed:
 * - Parsing/diffing large JSON (10–50MB) off the main thread
 * - Progress messages ("Parsing…") while the worker runs
 * - Avoids storing large objects in React state; keep canonical
 *   instances in refs at the component level
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type JsonParseOk = {
  ok: true
  json: any
  // Optional precomputed pretty lines to use with PrettyJsonView
  prettyLinesLength?: number
}

export type JsonParseErr = {
  ok: false
  error: {
    message: string
    position?: number
    line?: number
    column?: number
  }
}

export type JsonParseResult = JsonParseOk | JsonParseErr

export type JsonDiffResult = {
  identical: boolean
  summary: { added: number; removed: number; modified: number }
  // A capped sample of difference paths to show in UI
  differences: Array<{ type: 'added' | 'removed' | 'modified'; path: string }>
}

type WorkerProgress = {
  type: 'progress'
  id: string
  progress?: number
  message?: string
}

type WorkerResponse<T = any> = {
  type: 'result'
  id: string
  payload: T
}

type WorkerError = {
  type: 'error'
  id: string
  error: string
}

type Job = 'parse' | 'diff'

export function useJsonWorker() {
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<{ id: string; job: Job } | null>(null)

  const [isBusy, setIsBusy] = useState(false)
  const [progressText, setProgressText] = useState<string | null>(null)
  const [progressValue, setProgressValue] = useState<number | null>(null)
  const progressTimerRef = useRef<any>(null)

  // Lazily create worker once
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        // @ts-ignore - bundlers (Next/Vite) resolve this URL at build-time
        new URL('../workers/json.worker.ts', import.meta.url),
        { type: 'module' }
      )
    } catch (err) {
      workerRef.current = null
    }

    const worker = workerRef.current
    if (!worker) return

    const handleMessage = (evt: MessageEvent<WorkerProgress | WorkerResponse | WorkerError>) => {
      const data = evt.data
      if (!data) return

      // Progress events
      if ((data as WorkerProgress).type === 'progress') {
        const p = data as WorkerProgress
        // Debounce UI updates to avoid spamming renders on very chatty workers
        if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
        progressTimerRef.current = setTimeout(() => {
          setProgressText(p.message ?? null)
          if (typeof p.progress === 'number') setProgressValue(p.progress)
        }, 50)
        return
      }

      // Result events
      if ((data as WorkerResponse).type === 'result') {
        setIsBusy(false)
        setProgressText(null)
        setProgressValue(null)
        pendingRef.current = null
        // Results are delivered per-request via a resolver map stored on window
        // (kept internal to this hook instance via a closure)
        ;(resolveMap.get((data as WorkerResponse).id) as (v: any) => void)?.((data as WorkerResponse).payload)
        resolveMap.delete((data as WorkerResponse).id)
        return
      }

      // Error events
      if ((data as WorkerError).type === 'error') {
        setIsBusy(false)
        setProgressText(null)
        setProgressValue(null)
        pendingRef.current = null
        ;(rejectMap.get((data as WorkerError).id) as (e: any) => void)?.((data as WorkerError).error)
        rejectMap.delete((data as WorkerError).id)
      }
    }

    worker.addEventListener('message', handleMessage)
    return () => {
      worker.removeEventListener('message', handleMessage)
      worker.terminate()
      workerRef.current = null
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
    }
  }, [])

  // Local resolver storage per-hook instance
  const resolveMap = useMemo(() => new Map<string, (v: any) => void>(), [])
  const rejectMap = useMemo(() => new Map<string, (e: any) => void>(), [])

  const run = useCallback(
    <T,>(job: Job, payload: any): Promise<T> => {
      if (!workerRef.current) return Promise.reject(new Error('JSON worker not available'))
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      pendingRef.current = { id, job }
      setIsBusy(true)
      setProgressText(job === 'parse' ? 'Parsing…' : 'Diffing…')
      setProgressValue(null)

      return new Promise<T>((resolve, reject) => {
        resolveMap.set(id, resolve)
        rejectMap.set(id, reject)
        workerRef.current!.postMessage({ type: job, id, payload })
      })
    },
    []
  )

  const cancel = useCallback(() => {
    if (!workerRef.current || !pendingRef.current) return
    try {
      workerRef.current.postMessage({ type: 'cancel', id: pendingRef.current.id })
    } finally {
      setIsBusy(false)
      setProgressText(null)
      setProgressValue(null)
      pendingRef.current = null
    }
  }, [])

  const parseJson = useCallback(
    (text: string, opts?: { computePrettyLines?: boolean }): Promise<JsonParseResult> =>
      run<JsonParseResult>('parse', { text, computePrettyLines: !!opts?.computePrettyLines }),
    [run]
  )

  const parseJsonBlob = useCallback(
    (blob: Blob, opts?: { computePrettyLines?: boolean }): Promise<JsonParseResult> =>
      run<JsonParseResult>('parse', { blob, computePrettyLines: !!opts?.computePrettyLines }),
    [run]
  )

  const diffJson = useCallback(
    (left: any, right: any, opts?: { maxDiffs?: number; ignoreKeyOrder?: boolean; ignoreArrayOrder?: boolean }): Promise<JsonDiffResult> =>
      run<JsonDiffResult>('diff', { left, right, options: opts ?? {} }),
    [run]
  )

  return {
    parseJson,
    parseJsonBlob,
    diffJson,
    cancel,
    isBusy,
    progressText,
    progressValue,
  }
}

export default useJsonWorker
