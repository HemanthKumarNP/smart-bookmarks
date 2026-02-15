'use client'
import { supabase } from '@/lib/supabaseClient'
import { useState } from 'react'

export default function AddBookmark() {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const addBookmark = async () => {
    if (!title.trim() || !url.trim()) return

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('bookmarks').insert({
        title: title.trim(),
        url: url.trim(),
        user_id: user.id,
      })

      setTitle('')
      setUrl('')
    }
    setLoading(false)
  }

  return (
    <div className="my-4 space-y-2">
      <input 
        placeholder="Title" 
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full px-4 py-2 border rounded"
      />
      <input 
        placeholder="URL" 
        value={url}
        onChange={e => setUrl(e.target.value)}
        className="w-full px-4 py-2 border rounded"
      />
      <button 
        onClick={addBookmark}
        disabled={loading || !title.trim() || !url.trim()}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
      >
        {loading ? 'Adding...' : 'Add Bookmark'}
      </button>
    </div>
  )
}