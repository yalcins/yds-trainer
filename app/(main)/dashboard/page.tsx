'use client'
import { useEffect, useState } from 'react'
import { loadData } from '@/lib/data'
import type { YDSData } from '@/lib/types'
import Dashboard from '@/components/Dashboard'

export default function DashboardPage() {
  const [data, setData] = useState<YDSData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadData().then(setData).catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-center">
        <div>
          <div className="text-4xl mb-3">⚠️</div>
          <p className="font-bold text-[#FF4B4B]">Veriler yüklenemedi.</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📊</div>
      </div>
    )
  }

  return <Dashboard data={data} />
}
