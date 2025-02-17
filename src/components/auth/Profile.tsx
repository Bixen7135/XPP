import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Camera, Loader2, Upload, Info } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { PageLayout } from '../common/PageLayout';
import { supabase } from '../../services/supabase';

interface Profile {
  username: string;
  email: string;
  avatar_url?: string;
}

// Add constants for restrictions
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const RECOMMENDED_DIMENSIONS = '400x400';

export const Profile = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
        setUsername(data.username);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setUpdating(true);
      setError(null);

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      setProfile(prev => prev ? { ...prev, username } : null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setError('Please upload a valid image (JPEG, PNG, or WebP)');
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError('Image size should be less than 2MB');
        return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: filePath } : null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout maxWidth="sm">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-4 group">
            <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={`${supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-blue-600" />
              )}
            </div>
            <label 
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 
                       text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100
                       transition-opacity duration-200"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </label>
          </div>
          
          {/* Add tooltip with upload requirements */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
            <Info className="w-4 h-4" />
            <span>
              Recommended: {RECOMMENDED_DIMENSIONS}px • Max 2MB • JPEG, PNG, WebP
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 text-red-600 p-4 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border rounded-xl focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="pl-10 pr-4 py-3 w-full border rounded-xl bg-gray-50 text-gray-500"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Email cannot be changed
            </p>
          </div>

          <button
            type="submit"
            disabled={updating}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl
                     font-medium hover:bg-blue-700 focus:outline-none 
                     focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:bg-blue-400 disabled:cursor-not-allowed
                     transition-colors duration-200"
          >
            {updating ? (
              <Loader2 className="animate-spin h-5 w-5 mx-auto" />
            ) : (
              'Update Profile'
            )}
          </button>
        </form>
      </motion.div>
    </PageLayout>
  );
}; 