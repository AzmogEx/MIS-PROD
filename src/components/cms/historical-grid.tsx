'use client'

import { createContext, useContext } from 'react'

export const HistoricalGridContext = createContext<'original' | 'uniform'>('original')
export const useHistoricalGrid = () => useContext(HistoricalGridContext)
