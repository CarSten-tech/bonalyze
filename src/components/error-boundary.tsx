'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error in React component tree', error, { errorInfo })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4">
          <div className="p-4 bg-red-50 rounded-full dark:bg-red-900/20">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground dark:text-foreground">
            Da ist etwas schiefgelaufen
          </h2>
          <p className="text-sm text-muted-foreground max-w-[300px]">
            Ein unerwarteter Fehler ist aufgetreten. Wir wurden benachrichtigt und kümmern uns darum.
          </p>
          <div className="pt-4">
            <Button onClick={this.handleReload} variant="outline" className="gap-2">
              <RefreshCcw className="w-4 h-4" />
              Seite neu laden
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="p-4 mt-8 overflow-auto text-left text-xs font-mono bg-muted rounded-md dark:bg-muted max-w-full w-full max-h-[200px]">
              <p className="font-bold text-red-600 dark:text-red-400 mb-2">
                {this.state.error.toString()}
              </p>
              <pre className="text-muted-foreground dark:text-muted-foreground whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
