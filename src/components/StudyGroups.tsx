import React, { useState, useEffect } from 'react'
import { Users, Plus, MessageCircle, Send, Crown, UserPlus, Settings, Hash } from 'lucide-react'
import { supabase, StudyGroup, GroupMember, GroupMessage } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function StudyGroups() {
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_private: false
  })

  useEffect(() => {
    if (user) {
      fetchGroups()
      fetchMyGroups()
    }
  }, [user])

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages()
      fetchMembers()
      
      // Subscribe to new messages
      const subscription = supabase
        .channel(`group_messages_${selectedGroup.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${selectedGroup.id}`
        }, (payload) => {
          const newMessage = payload.new as GroupMessage
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [selectedGroup])

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select('*')
        .eq('is_private', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGroups(data || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const fetchMyGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          group_members!inner(user_id)
        `)
        .eq('group_members.user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMyGroups(data || [])
    } catch (error) {
      console.error('Error fetching my groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!selectedGroup) return

    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', selectedGroup.id)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchMembers = async () => {
    if (!selectedGroup) return

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', selectedGroup.id)

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          name: formData.name,
          description: formData.description,
          created_by: user!.id,
          is_private: formData.is_private
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user!.id,
          role: 'admin'
        })

      if (memberError) throw memberError

      toast.success('Study group created successfully!')
      resetForm()
      fetchGroups()
      fetchMyGroups()
    } catch (error) {
      console.error('Error creating group:', error)
      toast.error('Failed to create group')
    }
  }

  const joinGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user!.id,
          role: 'member'
        })

      if (error) throw error
      toast.success('Joined group successfully!')
      fetchMyGroups()
    } catch (error) {
      console.error('Error joining group:', error)
      toast.error('Failed to join group')
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedGroup) return

    setSendingMessage(true)
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: selectedGroup.id,
          user_id: user!.id,
          message: newMessage.trim()
        })

      if (error) throw error
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_private: false
    })
    setShowCreateForm(false)
  }

  const isGroupMember = (groupId: string) => {
    return myGroups.some(group => group.id === groupId)
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (selectedGroup) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 h-[700px] flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedGroup(null)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              ←
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Hash className="w-5 h-5 text-purple-500" />
                {selectedGroup.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{members.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{members.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-3 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.user_id === user?.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'
                }`}
              >
                {message.user_id !== user?.id && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    User {message.user_id.slice(0, 8)}
                  </div>
                )}
                <div>{message.message}</div>
                <div className={`text-xs mt-1 ${
                  message.user_id === user?.id ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
          )}
        </div>

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sendingMessage}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6" />
          Study Groups
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Create Study Group</h3>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <input
              type="text"
              placeholder="Group name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_private}
                onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Private group</span>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create Group
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {myGroups.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">My Groups</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myGroups.map((group) => (
                <div key={group.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 dark:text-white flex items-center gap-2">
                        {group.name}
                        {group.created_by === user?.id && <Crown className="w-4 h-4 text-yellow-500" />}
                      </h4>
                      {group.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setSelectedGroup(group)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Public Groups</h3>
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                No public groups yet
              </h4>
              <p className="text-gray-400 dark:text-gray-500">
                Create the first study group to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map((group) => (
                <div key={group.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 dark:text-white">{group.name}</h4>
                      {group.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </span>
                    {isGroupMember(group.id) ? (
                      <button
                        onClick={() => setSelectedGroup(group)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                      </button>
                    ) : (
                      <button
                        onClick={() => joinGroup(group.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Join
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}