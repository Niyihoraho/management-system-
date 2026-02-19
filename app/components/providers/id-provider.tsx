"use client"

import { createContext, useContext, useEffect, useState } from "react"

interface IdProviderProps {
  children: React.ReactNode
}

const IdContext = createContext<{
  generateId: () => string
}>({
  generateId: () => "",
})

let idCounter = 0

export function IdProvider({ children }: IdProviderProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const generateId = () => {
    if (!isClient) {
      // Return a consistent ID during SSR
      return `radix-id-${++idCounter}`
    }
    // Generate unique IDs on client
    return `radix-${Math.random().toString(36).substr(2, 9)}`
  }

  return (
    <IdContext.Provider value={{ generateId }}>
      {children}
    </IdContext.Provider>
  )
}

export const useId = () => {
  const context = useContext(IdContext)
  if (!context) {
    throw new Error("useId must be used within an IdProvider")
  }
  return context.generateId
}
