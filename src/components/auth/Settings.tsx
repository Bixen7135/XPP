import React, { useState } from 'react';
import { PageLayout } from '../common/PageLayout';
import { motion } from 'framer-motion';
import { Button } from '../common/Button';
import { Bell, Shield, Monitor, Save } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useToast } from '../Toast';

export const Settings: React.FC = () => {
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    taskReminders: true
  });
  const [privacy, setPrivacy] = useState({
    showProfileToPublic: true
  });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      // Here you would connect this to Supabase to save user preferences
      // For now we'll just simulate a successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <PageLayout maxWidth="2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Settings</h1>
          <p className="text-gray-600">
            Customize your experience on the platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Notifications Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Bell className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-gray-600">Receive notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={notifications.emailNotifications}
                    onChange={() => setNotifications({
                      ...notifications,
                      emailNotifications: !notifications.emailNotifications
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Task Reminders</h3>
                  <p className="text-sm text-gray-600">Receive reminders for incomplete tasks</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={notifications.taskReminders}
                    onChange={() => setNotifications({
                      ...notifications,
                      taskReminders: !notifications.taskReminders
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
          
          {/* Appearance Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Monitor className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Appearance</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Theme</h3>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System Default</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Privacy Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Shield className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold">Privacy</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Show Profile to Public</h3>
                  <p className="text-sm text-gray-600">Allow others to view your profile</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={privacy.showProfileToPublic}
                    onChange={() => setPrivacy({
                      ...privacy,
                      showProfileToPublic: !privacy.showProfileToPublic
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </div>
        </div>
      </motion.div>
    </PageLayout>
  );
}; 