"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Role } from '@/lib/types'

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    async function getSessionAndUser() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          if (mounted) {
            setUser(null)
            setRole(null)
            setLoading(false)
          }
          return
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', session.user.id)
          .single()

        if (userError || !userData) {
          console.error('Error fetching user data:', userError)
          if (mounted) {
            setUser(null)
            setRole(null)
            setLoading(false)
          }
          return
        }

        if (mounted) {
          // Map name -> full_name for backward compat
          const mappedUser = {
            ...userData,
            full_name: userData.name,
          } as User
          setUser(mappedUser)
          setRole(userData.role as Role)
          setLoading(false)
        }
      } catch (error) {
        console.error('Unexpected error in getSessionAndUser:', error)
        if (mounted) {
          setUser(null)
          setRole(null)
          setLoading(false)
        }
      }
    }

    getSessionAndUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setRole(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        getSessionAndUser()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    role,
    loading,
    isEmployee: role === 'employee',
    isManager: role === 'manager',
    isAdmin: role === 'admin'
  }
}