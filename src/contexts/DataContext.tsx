import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchCajaMovimientos } from '../services/caja'
import { fetchChoferes } from '../services/choferes'
import { fetchClientes } from '../services/clientes'
import { fetchVehiculos } from '../services/vehiculos'
import { fetchViajes } from '../services/viajes'
import type {
  CajaMovimiento,
  Chofer,
  Cliente,
  Vehiculo,
  ViajeWithRelations,
} from '../types/database'
import { useAuth } from './AuthContext'

interface DataContextValue {
  vehiculos: Vehiculo[]
  choferes: Chofer[]
  clientes: Cliente[]
  viajes: ViajeWithRelations[]
  caja: CajaMovimiento[]
  loading: boolean
  error: string | null
  refreshAll: () => Promise<void>
  refreshVehiculos: () => Promise<void>
  refreshChoferes: () => Promise<void>
  refreshClientes: () => Promise<void>
  refreshViajes: () => Promise<void>
  refreshCaja: () => Promise<void>
  setVehiculosOptimistic: (updater: (prev: Vehiculo[]) => Vehiculo[]) => void
  setChoferesOptimistic: (updater: (prev: Chofer[]) => Chofer[]) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [viajes, setViajes] = useState<ViajeWithRelations[]>([])
  const [caja, setCaja] = useState<CajaMovimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshVehiculos = useCallback(async () => {
    const data = await fetchVehiculos()
    setVehiculos(data)
  }, [])

  const refreshChoferes = useCallback(async () => {
    const data = await fetchChoferes()
    setChoferes(data)
  }, [])

  const refreshClientes = useCallback(async () => {
    const data = await fetchClientes()
    setClientes(data)
  }, [])

  const refreshViajes = useCallback(async () => {
    const data = await fetchViajes()
    setViajes(data)
  }, [])

  const refreshCaja = useCallback(async () => {
    const data = await fetchCajaMovimientos()
    setCaja(data)
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        refreshVehiculos(),
        refreshChoferes(),
        refreshClientes(),
        refreshViajes(),
        refreshCaja(),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [refreshVehiculos, refreshChoferes, refreshClientes, refreshViajes, refreshCaja])

  useEffect(() => {
    if (session) {
      refreshAll()
    } else {
      setVehiculos([])
      setChoferes([])
      setClientes([])
      setViajes([])
      setCaja([])
      setLoading(false)
    }
  }, [session, refreshAll])

  const value = useMemo<DataContextValue>(
    () => ({
      vehiculos,
      choferes,
      clientes,
      viajes,
      caja,
      loading,
      error,
      refreshAll,
      refreshVehiculos,
      refreshChoferes,
      refreshClientes,
      refreshViajes,
      refreshCaja,
      setVehiculosOptimistic: setVehiculos,
      setChoferesOptimistic: setChoferes,
    }),
    [
      vehiculos,
      choferes,
      clientes,
      viajes,
      caja,
      loading,
      error,
      refreshAll,
      refreshVehiculos,
      refreshChoferes,
      refreshClientes,
      refreshViajes,
      refreshCaja,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider')
  return ctx
}
