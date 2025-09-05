import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageCircle, Send, Hash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast'

interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_email?: string;
}

export default function StudyGroups() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fixed group ID for the single study group
  const STUDY_GROUP_ID = 'study-group-main';

  useEffect(() => {
    if (user) {
      initializeStudyGroup();
    }
  }, [user]);

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeStudyGroup = async () => {
    try {
      // Check if the main study group exists
      const { data: existingGroup, error: checkError } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', STUDY_GROUP_ID)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingGroup) {
        // Create the main study group
        const { error: createError } = await supabase
          .from('study_groups')
          .insert({
            id: STUDY_GROUP_ID,
            name: 'Study Group',
            description: 'Main study group for all students',
            created_by: user?.id,
            is_private: false
          });

        if (createError) throw createError;
      }

      // Add user as member if not already
      const { data: membership } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', STUDY_GROUP_ID)
        .eq('user_id', user?.id)
        .single();

      if (!membership) {
        await supabase
          .from('group_members')
          .insert({
            group_id: STUDY_GROUP_ID,
            user_id: user?.id,
            role: 'member'
          });
      }
    } catch (error) {
      console.error('Error initializing study group:', error);
      toast.error('Failed to initialize study group');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          *,
          users(email)
        `)
        .eq('group_id', STUDY_GROUP_ID)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messagesWithEmail = data.map(msg => ({
        ...msg,
        user_email: msg.users?.email || 'Unknown User'
      }));

      setMessages(messagesWithEmail);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`group_messages:${STUDY_GROUP_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${STUDY_GROUP_ID}`
        },
        (payload) => {
          // Only fetch messages if it's a new message (not from current user to avoid duplicates)
          if (payload.new.user_id !== user?.id) {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: STUDY_GROUP_ID,
          user_id: user.id,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
      // Don't fetch messages here to avoid duplicates - let the subscription handle it
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-600" />
          Study Group
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Connect and chat with fellow students
        </p>
      </div>

      {/* Chat Area */}
      <div className="h-[500px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.user_id === user?.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {message.user_id !== user?.id && (
                    <p className="text-xs opacity-75 mb-1">{message.user_email}</p>
                  )}
                  <p className="text-sm">{message.message}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={sendingMessage}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMessage}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendingMessage ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}