import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AuthGuard } from '@/components/auth'
import { Settings as SettingsIcon, User, Bell, Shield, Download } from 'lucide-react'

export default function Settings() {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account preferences and settings</p>
          </div>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="Enter your first name" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Enter your last name" />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Input id="bio" placeholder="Tell us about yourself" />
            </div>
            <Button>Save Profile</Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="analysis-complete">Analysis Complete</Label>
                <p className="text-sm text-gray-600">Get notified when your analysis is ready</p>
              </div>
              <Switch id="analysis-complete" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-digest">Weekly Digest</Label>
                <p className="text-sm text-gray-600">Receive weekly summaries of your activity</p>
              </div>
              <Switch id="weekly-digest" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="new-features">New Features</Label>
                <p className="text-sm text-gray-600">Be the first to know about new features</p>
              </div>
              <Switch id="new-features" />
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="data-retention">Data Retention</Label>
                <p className="text-sm text-gray-600">Automatically delete session data after 24 hours</p>
              </div>
              <Switch id="data-retention" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="analytics">Anonymous Analytics</Label>
                <p className="text-sm text-gray-600">Help us improve by sharing anonymous usage data</p>
              </div>
              <Switch id="analytics" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Button variant="outline">Change Password</Button>
            </div>
          </CardContent>
        </Card>

        {/* Export Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Data Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Export your data including personas, analyses, and settings
            </p>
            <div className="flex space-x-2">
              <Button variant="outline">Export All Data</Button>
              <Button variant="outline">Export Analyses Only</Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Delete Account:</strong> This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
} 