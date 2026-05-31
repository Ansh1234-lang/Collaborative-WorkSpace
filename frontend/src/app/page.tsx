'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/store/auth.store'

export default function RootPage() {
  const router = useRouter()
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    if (token) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      Loading...
    </div>
  )
}