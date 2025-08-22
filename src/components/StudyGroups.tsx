import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageCircle, Plus, Send, Search, Settings, UserPlus, Crown, Hash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  created_by: string;
  is_private: boolean;
  created_at: string;
  member_count?: number;
  creator_email?: string;
}

interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_email?: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_email?: string;
}

export default function StudyGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [userMemberGroupIds, setUserMemberGroupIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages();
      fetchMembers();
      subscribeToMessages();
    }
  }, [selectedGroup]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroups = async () => {
    try {
      // First, get groups that are public or created by the user
      const { data: publicAndOwnedGroups, error: publicError } = await supabase
        .from('study_groups')
        .select('*')
        .or(`is_private.eq.false,created_by.eq.${user?.id}`);

      if (publicError) throw publicError;

      // Second, get group IDs where the user is a member
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user?.id);

      if (membershipError) throw membershipError;

      const memberGroupIds = membershipData?.map(m => m.group_id) || [];
      setUserMemberGroupIds(memberGroupIds);

      // Third, get details of groups where user is a member (if any)
      let memberGroups: StudyGroup[] = [];
      if (memberGroupIds.length > 0) {
        const { data: memberGroupsData, error: memberGroupsError } = await supabase
          .from('study_groups')
          .select('*')
          .in('id', memberGroupIds);

        if (memberGroupsError) throw memberGroupsError;
        memberGroups = memberGroupsData || [];
      }

      // Combine and deduplicate results
      const allGroups = [...(publicAndOwnedGroups || []), ...memberGroups];
      const uniqueGroups = allGroups.filter((group, index, self) => 
        index === self.findIndex(g => g.id === group.id)
      );
      // Count members for each group
      const groupsWithCounts = await Promise.all(
        uniqueGroups.map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            member_count: count || 0
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          *,
          users!group_messages_user_id_fkey(email)
        `)
        .eq('group_id', selectedGroup.id)
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

  const fetchMembers = async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          users!group_members_user_id_fkey(email)
        `)
        .eq('group_id', selectedGroup.id);

      if (error) throw error;

      const membersWithEmail = data.map(member => ({
        ...member,
        user_email: member.users?.email || 'Unknown User'
      }));

      setMembers(membersWithEmail);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedGroup) return;

    const subscription = supabase
      .channel(`group_messages:${selectedGroup.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${selectedGroup.id}`
        },
        (payload) => {
          fetchMessages(); // Refetch to get user email
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('study_groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          created_by: user.id,
          is_private: isPrivate
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin member
      await supabase
        .from('group_members')
        .insert({
          group_id: data.id,
          user_id: user.id,
          role: 'admin'
        });

      setNewGroupName('');
      setNewGroupDescription('');
      setIsPrivate(false);
      setShowCreateForm(false);
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;
      fetchGroups();
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGroup || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: selectedGroup.id,
          user_id: user.id,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isUserMember = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group && (group.created_by === user?.id || userMemberGroupIds.includes(groupId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Study Groups</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Group</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedGroup?.id === group.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300'
                }`}
                onClick={() => setSelectedGroup(group)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-gray-500" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                      {group.is_private && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Private</span>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {group.member_count} members
                      </span>
                      {!isUserMember(group.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            joinGroup(group.id);
                          }}
                          className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-96 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Hash className="h-5 w-5 text-gray-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{selectedGroup.name}</h3>
                      <p className="text-sm text-gray-500">{members.length} members</p>
                    </div>
                  </div>
                  <Settings className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-600" />
                </div>
              </div>

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
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-96 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a group to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Study Group</h3>
            <form onSubmit={createGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="private"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="private" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Private Group
                </label>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}