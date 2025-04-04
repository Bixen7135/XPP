import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Upload, Camera, Edit2, KeyRound, Save } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Button } from '../common/Button';
import { useToast } from '../Toast';
import { motion } from 'framer-motion';
import { PageLayout } from '../common/PageLayout';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { showToast } = useToast();
  
  useEffect(() => {
    loadProfile();
  }, []);
  
  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setAvatar(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveProfile = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatar,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      await loadProfile();
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangePassword = async () => {
    try {
      setLoading(true);
      setPasswordError('');
      
      // Validate passwords
      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
      
      if (newPassword.length < 6) {
        setPasswordError('Password must be at least 6 characters');
        return;
      }
      
      // First verify the current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword
      });
      
      if (verifyError) {
        setPasswordError('Current password is incorrect');
        return;
      }
      
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) throw updateError;
      
      // Reset form and show success message
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      showToast('Password updated successfully', 'success');
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Failed to update password');
      showToast('Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !profile) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout maxWidth="2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2 text-white">My Profile</h1>
          <p className="text-gray-400">
            View and update your profile information.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700">
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 mb-4 relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={`${profile.first_name} ${profile.last_name}`}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  ) : (
                    <User size={64} />
                  )}
                  {isEditing && (
                    <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 shadow-lg">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-white">{profile?.first_name} {profile?.last_name}</h2>
                <p className="text-gray-400 mb-4">{profile?.email}</p>
                <p className="text-sm text-gray-500">
                  Member since {new Date(profile?.created_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <div className="bg-gray-800 rounded-xl shadow-sm p-6 mb-6 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Profile Information</h3>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 className="w-4 h-4" />}
                    onClick={() => setIsEditing(true)}
                    className="text-white hover:text-white hover:bg-gray-700"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10 w-full p-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10 w-full p-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={profile?.email}
                        disabled
                        className="pl-10 w-full p-3 border border-gray-700 bg-gray-900 rounded-xl text-gray-400"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Avatar URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Upload className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={avatar || ''}
                        onChange={(e) => setAvatar(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="pl-10 w-full p-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setFirstName(profile?.first_name || '');
                        setLastName(profile?.last_name || '');
                        setAvatar(profile?.avatar_url || '');
                      }}
                      className="text-white hover:text-white hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      icon={<Save className="w-4 h-4" />}
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-400 mb-1">Full Name</div>
                    <div className="text-white">{profile?.first_name} {profile?.last_name}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-400 mb-1">Email</div>
                    <div className="text-white">{profile?.email}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-400 mb-1">Member Since</div>
                    <div className="text-white">{new Date(profile?.created_at || '').toLocaleDateString()}</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Security</h3>
                {!isChangingPassword && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<KeyRound className="w-4 h-4" />}
                    onClick={() => setIsChangingPassword(true)}
                    className="text-white hover:text-white hover:bg-gray-700"
                  >
                    Change Password
                  </Button>
                )}
              </div>
              
              {isChangingPassword ? (
                <div className="space-y-4">
                  {passwordError && (
                    <div className="bg-red-900/20 p-3 rounded-md text-sm text-red-200 border border-red-800">
                      {passwordError}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pl-10 w-full p-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 w-full p-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 w-full p-3 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordError('');
                      }}
                      className="text-white hover:text-white hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      icon={<KeyRound className="w-4 h-4" />}
                      onClick={handleChangePassword}
                      disabled={loading}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Update Password
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400">
                    You can change your password at any time to keep your account secure.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </PageLayout>
  );
}; 