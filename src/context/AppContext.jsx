import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useTimerWorker } from '../hooks/useTimerWorker'

const AppContext = createContext()

export const useApp = () => useContext(AppContext)

export const AppProvider = ({ children }) => {
  const [ghosts, setGhosts] = useState([])
  const [selectedEvidence, setSelectedEvidence] = useState({})
  const [selectedSpeed, setSelectedSpeed] = useState({})
  const [selectedHuntEvidence, setSelectedHuntEvidence] = useState({})
  const [selectedSanity, setSelectedSanity] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [excludedGhosts, setExcludedGhosts] = useState(new Set())
  const [sortOrder, setSortOrder] = useState('default')
  const [settings, setSettings] = useState({
    darkMode: true,
    fontSize: 'medium'
  })
  const [gameVersion, setGameVersion] = useState(() => {
    return localStorage.getItem('phasmo-game-version') || 'v1-000-031'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Timer worker
  const timerWorker = useTimerWorker()
  
  // Timer states
  const [smudgeTimer, setSmudgeTimer] = useState({
    isPlaying: false,
    timeLeft: 180, // 3 minutes in seconds
    elapsedTime: 0
  })
  const [huntCooldownTimer, setHuntCooldownTimer] = useState({
    isPlaying: false,
    timeLeft: 25, // 25 seconds
    elapsedTime: 0
  })

  useEffect(() => {
    const fetchGhosts = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/data/ghosts-${gameVersion}.json`)
        if (!response.ok) {
          throw new Error('Failed to fetch ghost data')
        }
        const data = await response.json()
        setGhosts(data.ghosts || [])
        setIsLoading(false)
      } catch (err) {
        setError(err.message)
        setIsLoading(false)
      }
    }

    localStorage.setItem('phasmo-game-version', gameVersion)
    fetchGhosts()
  }, [gameVersion])

  // Set up timer worker listeners
  useEffect(() => {
    const smudgeCleanup = timerWorker.addListener('smudge', (data) => {
      if (data.paused) {
        setSmudgeTimer(prev => ({
          ...prev,
          isPlaying: false,
          elapsedTime: data.totalElapsed
        }))
      } else if (data.stopped || data.reset) {
        setSmudgeTimer(prev => ({
          ...prev,
          isPlaying: false,
          timeLeft: data.timeLeft || 180,
          elapsedTime: 0
        }))
      } else {
        setSmudgeTimer(prev => ({
          ...prev,
          isPlaying: !data.isFinished,
          timeLeft: data.timeLeft,
          elapsedTime: data.totalElapsed
        }))
      }
    })

    const huntCleanup = timerWorker.addListener('huntCooldown', (data) => {
      if (data.paused) {
        setHuntCooldownTimer(prev => ({
          ...prev,
          isPlaying: false,
          elapsedTime: data.totalElapsed
        }))
      } else if (data.stopped || data.reset) {
        setHuntCooldownTimer(prev => ({
          ...prev,
          isPlaying: false,
          timeLeft: data.timeLeft || 25,
          elapsedTime: 0
        }))
      } else {
        setHuntCooldownTimer(prev => ({
          ...prev,
          isPlaying: !data.isFinished,
          timeLeft: data.timeLeft,
          elapsedTime: data.totalElapsed
        }))
      }
    })

    return () => {
      smudgeCleanup()
      huntCleanup()
    }
  }, [timerWorker])

  const huntEvidenceList = useMemo(() => {
    const map = new Map()
    ghosts.forEach(ghost => {
      (ghost.hunt_evidence || []).forEach(he => {
        if (map.has(he.id)) {
          const existing = map.get(he.id)
          existing.ghost = existing.ghost + ', ' + ghost.ghost
        } else {
          map.set(he.id, { id: he.id, label: he.label, ghost: ghost.ghost, excludeOnly: he.excludeOnly || false })
        }
      })
    })
    return Array.from(map.values())
  }, [ghosts])

  const updateSettings = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const value = useMemo(() => ({
    huntEvidenceList,
    ghosts,
    setGhosts,
    gameVersion,
    setGameVersion,
    selectedEvidence,
    setSelectedEvidence,
    selectedSpeed,
    setSelectedSpeed,
    selectedHuntEvidence,
    setSelectedHuntEvidence,
    selectedSanity,
    setSelectedSanity,
    searchQuery,
    setSearchQuery,
    excludedGhosts,
    setExcludedGhosts,
    sortOrder,
    setSortOrder,
    settings,
    setSettings,
    updateSettings,
    isLoading,
    setIsLoading,
    error,
    smudgeTimer,
    setSmudgeTimer,
    huntCooldownTimer,
    setHuntCooldownTimer,
    timerWorker
  }), [
    huntEvidenceList,
    ghosts,
    gameVersion,
    selectedEvidence,
    selectedSpeed,
    selectedHuntEvidence,
    selectedSanity,
    searchQuery,
    excludedGhosts,
    sortOrder,
    settings,
    isLoading,
    error,
    smudgeTimer,
    huntCooldownTimer,
    timerWorker
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export default AppContext 