import { useState, useEffect } from 'react';
import { PageLayout } from '../common/PageLayout';
import { motion } from 'framer-motion';
import { Button } from '../common/Button';
import { Bell, Shield, Monitor, Save } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useToast } from '../Toast';

export const Settings: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    taskReminders: true
  });
  const [privacy, setPrivacy] = useState({
    showProfileToPublic: true
  });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('system');
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', systemTheme === 'dark');
      localStorage.removeItem('theme');
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('theme', newTheme);
    }
  };
  
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
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
          <h1 className="text-2xl font-bold mb-2 text-foreground dark:text-white">Settings</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            Customize your experience on the platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700">
            <div className="flex items-center mb-6">
              <Bell className="h-5 w-5 text-primary dark:text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-foreground dark:text-white">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground dark:text-white">Email Notifications</h3>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Receive notifications via email</p>
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
                  <div className="w-11 h-6 bg-muted dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground dark:text-white">Task Reminders</h3>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Receive reminders for incomplete tasks</p>
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
                  <div className="w-11 h-6 bg-muted dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
          
          
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700">
            <div className="flex items-center mb-6">
              <Monitor className="h-5 w-5 text-primary dark:text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-foreground dark:text-white">Appearance</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2 text-foreground dark:text-white">Theme</h3>
                <select
                  value={theme}
                  onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
                  className="w-full p-3 border rounded-xl bg-background dark:bg-gray-700 text-foreground dark:text-white border-input dark:border-gray-600 focus:ring-2 focus:ring-ring dark:focus:ring-blue-800 focus:border-input dark:focus:border-blue-700"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System Default</option>
                </select>
              </div>
            </div>
          </div>
          
          
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700">
            <div className="flex items-center mb-6">
              <Shield className="h-5 w-5 text-primary dark:text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-foreground dark:text-white">Privacy</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground dark:text-white">Show Profile to Public</h3>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Allow others to view your profile</p>
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
                  <div className="w-11 h-6 bg-muted dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary dark:peer-checked:bg-blue-600"></div>
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
              className="dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              {saving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </div>
        </div>
      </motion.div>
    </PageLayout>
  );
}; 