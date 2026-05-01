'use client'
import { useEffect, useState } from 'react'
import { loadData } from '@/lib/data'
import type { YDSData } from '@/lib/types'
import Dashboard from '@/components/Dashboard'

export default function DashboardPage() {
  const [data, setData] = useState<YDSData | null>(null)

  useEffect(() => {
    loadData().then(setData)
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📊</div>
      </div>
    )
  }

  return <Dashboard data={data} />
}
