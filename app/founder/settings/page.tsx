'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Building2,
  Bell,
  Lock,
  Download,
  Trash2,
  RefreshCw,
  Save,
  AlertTriangle
} from 'lucide-react';
import { useFounderData } from '@/lib/hooks/useFounderData';
import { storageService } from '@/lib/services/storage.service';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { profile, loading } = useFounderData();
  const router = useRouter();

  // Account Settings
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Company Settings
  const [startupName, setStartupName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [qScoreUpdates, setQScoreUpdates] = useState(true);
  const [investorMessages, setInvestorMessages] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Update form states when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setEmail(profile.email || '');
      setStartupName(profile.startupName || '');
      setIndustry(profile.industry || '');
      setDescription(profile.description || '');
    }
  }, [profile]);

  const handleSaveAccount = () => {
    const success = storageService.updateFounderProfile({
      fullName,
      email,
    });

    if (success) {
      toast.success('Account settings saved');
    } else {
      toast.error('Failed to save settings');
    }
  };

  const handleSaveCompany = () => {
    const success = storageService.updateFounderProfile({
      startupName,
      industry,
      description,
    });

    if (success) {
      toast.success('Company settings saved');
    } else {
      toast.error('Failed to save settings');
    }
  };

  const handleExportData = () => {
    const allData = storageService.getAllFounderData();
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edge-alpha-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all your data? This cannot be undone.')) {
      storageService.clearAll();
      toast.success('All data cleared');
      router.push('/founder/onboarding');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-light">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-light text-gray-900">Settings</h1>
          <p className="text-gray-600 font-light">Manage your account and preferences</p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 font-light">
            <TabsTrigger value="account" className="font-light">Account</TabsTrigger>
            <TabsTrigger value="company" className="font-light">Company</TabsTrigger>
            <TabsTrigger value="notifications" className="font-light">Notifications</TabsTrigger>
            <TabsTrigger value="data" className="font-light">Data & Privacy</TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-600" />
                  <CardTitle className="font-light">Account Information</CardTitle>
                </div>
                <CardDescription className="font-light">
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-light">Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-light">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-light">Stage</Label>
                  <Input
                    value={profile?.stage || ''}
                    disabled
                    className="font-light bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 font-light">
                    Update this in your assessment
                  </p>
                </div>
                <Button onClick={handleSaveAccount} className="font-light">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Settings */}
          <TabsContent value="company" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <CardTitle className="font-light">Company Details</CardTitle>
                </div>
                <CardDescription className="font-light">
                  Manage your startup information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-light">Company Name</Label>
                  <Input
                    value={startupName}
                    onChange={(e) => setStartupName(e.target.value)}
                    placeholder="Your startup name"
                    className="font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-light">Industry</Label>
                  <Input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., B2B SaaS, FinTech"
                    className="font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-light">Description</Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your startup"
                    className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-gray-200 font-light focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button onClick={handleSaveCompany} className="font-light">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <CardTitle className="font-light">Notification Preferences</CardTitle>
                </div>
                <CardDescription className="font-light">
                  Choose what updates you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-normal">Email Notifications</Label>
                    <p className="text-sm text-gray-500 font-light">
                      Receive email updates about your account
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-normal">Q-Score Updates</Label>
                    <p className="text-sm text-gray-500 font-light">
                      Get notified when your Q-Score changes
                    </p>
                  </div>
                  <Switch
                    checked={qScoreUpdates}
                    onCheckedChange={setQScoreUpdates}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-normal">Investor Messages</Label>
                    <p className="text-sm text-gray-500 font-light">
                      Notifications for new investor connections
                    </p>
                  </div>
                  <Switch
                    checked={investorMessages}
                    onCheckedChange={setInvestorMessages}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-normal">Weekly Digest</Label>
                    <p className="text-sm text-gray-500 font-light">
                      Weekly summary of your progress
                    </p>
                  </div>
                  <Switch
                    checked={weeklyDigest}
                    onCheckedChange={setWeeklyDigest}
                  />
                </div>

                <Button className="font-light">
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data & Privacy */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-gray-600" />
                  <CardTitle className="font-light">Data Management</CardTitle>
                </div>
                <CardDescription className="font-light">
                  Export or delete your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h4 className="font-normal text-sm">Export Your Data</h4>
                  <p className="text-sm text-gray-500 font-light">
                    Download all your data in JSON format
                  </p>
                  <Button variant="outline" onClick={handleExportData} className="font-light">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-normal text-sm text-red-600 mb-2">Danger Zone</h4>
                  <p className="text-sm text-gray-500 font-light mb-4">
                    Permanently delete all your data from Edge Alpha
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleClearData}
                    className="font-light"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-normal text-sm text-gray-900 mb-1">
                      Data Storage
                    </h4>
                    <p className="text-sm text-gray-700 font-light">
                      Your data is currently stored locally in your browser. For production use,
                      connect to a database to sync across devices and enable team collaboration.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
