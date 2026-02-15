'use client'
import { supabase } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'

type Bookmark = {
  id: string
  title: string
  url: string
  user_id: string
  created_at: string
}

export default function BookmarkList() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    // Get user and fetch bookmarks
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        if (mounted) {
          setUserId(user.id)
        }

        const { data, error: fetchError } = await supabase
          .from('bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) {
          console.error('Fetch error:', fetchError)
          if (mounted) setError(fetchError.message)
        } else {
          console.log('Initial bookmarks loaded:', data?.length)
          if (mounted) setBookmarks(data || [])
        }
      } catch (err) {
        console.error('Error:', err)
        if (mounted) setError('Failed to load bookmarks')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (!userId) return

    console.log('Setting up realtime subscription for user:', userId)

    const channel = supabase
      .channel('public:bookmarks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('INSERT received:', payload)
          setBookmarks((current) => {
            if (current.some((b) => b.id === payload.new.id)) {
              return current
            }
            return [payload.new as Bookmark, ...current]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('DELETE received:', payload)
          setBookmarks((current) =>
            current.filter((b) => b.id !== payload.old.id)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('UPDATE received:', payload)
          setBookmarks((current) =>
            current.map((b) =>
              b.id === payload.new.id ? (payload.new as Bookmark) : b
            )
          )
        }
      )
      .subscribe((status, err) => {
        console.log('Realtime status:', status)
        if (err) console.error('Realtime error:', err)
      })

    return () => {
      console.log('Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [userId])

  const deleteBookmark = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      alert('Failed to delete bookmark')
    } else {
      console.log('Bookmark deleted:', id)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading bookmarks...</div>
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="space-y-2 mt-6">
      <h2 className="text-xl font-semibold mb-4">
        My Bookmarks ({bookmarks.length})
      </h2>

      {bookmarks.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No bookmarks yet. Add one above!
        </p>
      ) : (
        bookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className="flex justify-between items-center p-4 border rounded hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0 mr-4">
              <h3 className="font-semibold truncate">{bookmark.title}</h3>

              {/* ✅ FIXED JSX ERROR HERE */}
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline block truncate"
              >
                {bookmark.url}
              </a>
            </div>

            <button
              onClick={() => deleteBookmark(bookmark.id)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex-shrink-0"
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  )
}
