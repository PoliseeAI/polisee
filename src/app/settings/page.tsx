'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  User, 
  Bell, 
  Shield, 
  Download, 
  Loader2,
  FileText
} from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import { useAuthContext } from '@/lib/auth'
import { userPreferencesUtils, UserPreferencesRow } from '@/lib/supabase'
import { personaUtils } from '@/lib/supabase'
import { toast } from 'sonner'

interface ProfileData {
  firstName: string
  lastName: string
  email: string
  bio: string
}

interface NotificationSettings {
  analysisComplete: boolean
  weeklyDigest: boolean
  newFeatures: boolean
}

interface PrivacySettings {
  dataRetention: boolean
  analytics: boolean
}

interface PDFSettings {
  defaultZoom: number
  defaultPage: string
  showSectionNavigation: boolean
  highlightSourceReferences: boolean
  showSearchBar: boolean
  rememberPosition: boolean
  mobileOptimized: boolean
  hideControlsOnMobile: boolean
}

export default function Settings() {
  const { user, updateProfile, updatePassword } = useAuthContext()
  
  // State management
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    bio: ''
  })
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    analysisComplete: true,
    weeklyDigest: false,
    newFeatures: true
  })
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    dataRetention: true,
    analytics: false
  })
  const [pdfSettings, setPdfSettings] = useState<PDFSettings>({
    defaultZoom: 1.0,
    defaultPage: 'first',
    showSectionNavigation: true,
    highlightSourceReferences: true,
    showSearchBar: true,
    rememberPosition: true,
    mobileOptimized: true,
    hideControlsOnMobile: false
  })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  // Load user preferences on mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return
      
      setLoading(true)
      try {
        const userPrefs = await userPreferencesUtils.getUserPreferences(user.id)
        
        if (userPrefs) {
          setProfileData({
            firstName: userPrefs.first_name || '',
            lastName: userPrefs.last_name || '',
            email: user.email || '',
            bio: userPrefs.bio || ''
          })
          setNotificationSettings({
            analysisComplete: userPrefs.notify_analysis_complete,
            weeklyDigest: userPrefs.notify_weekly_digest,
            newFeatures: userPrefs.notify_new_features
          })
          setPrivacySettings({
            dataRetention: userPrefs.data_retention_enabled,
            analytics: userPrefs.analytics_enabled
          })
        } else {
          // Initialize with defaults
          setProfileData(prev => ({
            ...prev,
            email: user.email || ''
          }))
        }

        // Load PDF settings from localStorage
        try {
          const savedPdfSettings = localStorage.getItem(`pdf_settings_${user.id}`)
          if (savedPdfSettings) {
            setPdfSettings(JSON.parse(savedPdfSettings))
          }
        } catch (error) {
          console.error('Error loading PDF settings:', error)
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
        toast.error('Failed to load preferences')
      } finally {
        setLoading(false)
      }
    }

    loadUserPreferences()
  }, [user])

  // Save profile settings
  const handleSaveProfile = async () => {
    if (!user) return
    
    setSaving('profile')
    try {
      // Update profile in user preferences
      await userPreferencesUtils.updateProfileInfo(user.id, {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        bio: profileData.bio
      })
      
      // Update email in auth if changed
      if (profileData.email !== user.email) {
        await updateProfile({ email: profileData.email })
      }
      
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(null)
    }
  }

  // Save notification settings
  const handleNotificationChange = async (setting: keyof NotificationSettings, value: boolean) => {
    if (!user) return
    
    const newSettings = { ...notificationSettings, [setting]: value }
    setNotificationSettings(newSettings)
    
    try {
      await userPreferencesUtils.updateNotificationPreferences(user.id, {
        notify_analysis_complete: newSettings.analysisComplete,
        notify_weekly_digest: newSettings.weeklyDigest,
        notify_new_features: newSettings.newFeatures
      })
      toast.success('Notification settings updated')
    } catch (error) {
      console.error('Error updating notifications:', error)
      toast.error('Failed to update notification settings')
      // Revert on error
      setNotificationSettings(notificationSettings)
    }
  }

  // Save privacy settings
  const handlePrivacyChange = async (setting: keyof PrivacySettings, value: boolean) => {
    if (!user) return
    
    const newSettings = { ...privacySettings, [setting]: value }
    setPrivacySettings(newSettings)
    
    try {
      await userPreferencesUtils.updatePrivacyPreferences(user.id, {
        data_retention_enabled: newSettings.dataRetention,
        analytics_enabled: newSettings.analytics
      })
      toast.success('Privacy settings updated')
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      toast.error('Failed to update privacy settings')
      // Revert on error
      setPrivacySettings(privacySettings)
    }
  }

  // Save PDF settings
  const handlePdfSettingChange = async (setting: keyof PDFSettings, value: any) => {
    if (!user) return
    
    const newSettings = { ...pdfSettings, [setting]: value }
    setPdfSettings(newSettings)
    
    try {
      // Store PDF settings in localStorage for now
      // In a real app, you might want to store these in user preferences
      localStorage.setItem(`pdf_settings_${user.id}`, JSON.stringify(newSettings))
      toast.success('PDF viewer settings updated')
    } catch (error) {
      console.error('Error updating PDF settings:', error)
      toast.error('Failed to update PDF settings')
      // Revert on error
      setPdfSettings(pdfSettings)
    }
  }

  // Change password
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields')
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }
    
    setSaving('password')
    try {
      await updatePassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully')
    } catch (error) {
      console.error('Error updating password:', error)
      toast.error('Failed to update password')
    } finally {
      setSaving(null)
    }
  }

  // Export data
  const handleExportData = async (format: 'json' | 'csv') => {
    try {
      setLoading(true)
      
      // Mock export functionality - replace with actual implementation
      const exportData: Record<string, unknown> = {
        profile: {
          email: user?.email,
          created_at: new Date().toISOString()
        },
        preferences: {},
        export_date: new Date().toISOString(),
        format: format
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `polisee-data.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setLoading(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (!user) return
    
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.'
    )
    
    if (!confirmed) return
    
    const doubleConfirmed = window.confirm(
      'This is your final warning. Are you absolutely sure you want to delete your account and all associated data?'
    )
    
    if (!doubleConfirmed) return
    
    setSaving('delete-account')
    try {
      // Delete user preferences
      await userPreferencesUtils.deleteUserPreferences(user.id)
      
      // Delete persona
      await personaUtils.deletePersona(user.id)
      
      // Note: In a real app, you'd also need to delete the user account from auth
      // This typically requires admin privileges or a server-side function
      
      toast.success('Account deletion initiated. You will be logged out shortly.')
      
      // Log out user
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account. Please contact support.')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AuthGuard>
    )
  }

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
                <Input 
                  id="firstName" 
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter your first name" 
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter your last name" 
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email" 
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Input 
                id="bio" 
                value={profileData.bio}
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself" 
              />
            </div>
            <Button 
              onClick={handleSaveProfile}
              disabled={saving === 'profile'}
            >
              {saving === 'profile' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* PDF Viewer Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              PDF Viewer Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defaultZoom">Default Zoom Level</Label>
                <select 
                  id="defaultZoom"
                  className="w-full mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={pdfSettings.defaultZoom}
                  onChange={(e) => handlePdfSettingChange('defaultZoom', parseFloat(e.target.value))}
                >
                  <option value={0.5}>50%</option>
                  <option value={0.75}>75%</option>
                  <option value={1.0}>100%</option>
                  <option value={1.25}>125%</option>
                  <option value={1.5}>150%</option>
                  <option value={2.0}>200%</option>
                </select>
              </div>
              <div>
                <Label htmlFor="defaultPage">Always Start at Page</Label>
                <select 
                  id="defaultPage"
                  className="w-full mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={pdfSettings.defaultPage}
                  onChange={(e) => handlePdfSettingChange('defaultPage', e.target.value)}
                >
                  <option value="first">First Page</option>
                  <option value="last">Last Viewed Page</option>
                  <option value="source">Source Reference Page</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="showSectionNav">Show Section Navigation</Label>
                  <p className="text-sm text-gray-600">Display bill section navigation sidebar</p>
                </div>
                <Switch 
                  id="showSectionNav"
                  checked={pdfSettings.showSectionNavigation}
                  onCheckedChange={(value) => handlePdfSettingChange('showSectionNavigation', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="highlightSources">Highlight Source References</Label>
                  <p className="text-sm text-gray-600">Automatically highlight relevant bill sections</p>
                </div>
                <Switch 
                  id="highlightSources"
                  checked={pdfSettings.highlightSourceReferences}
                  onCheckedChange={(value) => handlePdfSettingChange('highlightSourceReferences', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="showSearch">Show Search Bar</Label>
                  <p className="text-sm text-gray-600">Display search functionality in PDF viewer</p>
                </div>
                <Switch 
                  id="showSearch"
                  checked={pdfSettings.showSearchBar}
                  onCheckedChange={(value) => handlePdfSettingChange('showSearchBar', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="rememberPosition">Remember Reading Position</Label>
                  <p className="text-sm text-gray-600">Resume reading from where you left off</p>
                </div>
                <Switch 
                  id="rememberPosition"
                  checked={pdfSettings.rememberPosition}
                  onCheckedChange={(value) => handlePdfSettingChange('rememberPosition', value)}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-3">Mobile Settings</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="mobileOptimized">Mobile Optimized View</Label>
                    <p className="text-sm text-gray-600">Optimize PDF layout for mobile devices</p>
                  </div>
                  <Switch 
                    id="mobileOptimized"
                    checked={pdfSettings.mobileOptimized}
                    onCheckedChange={(value) => handlePdfSettingChange('mobileOptimized', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hideControlsOnMobile">Auto-hide Controls</Label>
                    <p className="text-sm text-gray-600">Hide controls when not in use on mobile</p>
                  </div>
                  <Switch 
                    id="hideControlsOnMobile"
                    checked={pdfSettings.hideControlsOnMobile}
                    onCheckedChange={(value) => handlePdfSettingChange('hideControlsOnMobile', value)}
                  />
                </div>
              </div>
            </div>
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
              <Switch 
                id="analysis-complete"
                checked={notificationSettings.analysisComplete}
                onCheckedChange={(value) => handleNotificationChange('analysisComplete', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-digest">Weekly Digest</Label>
                <p className="text-sm text-gray-600">Receive weekly summaries of your activity</p>
              </div>
              <Switch 
                id="weekly-digest"
                checked={notificationSettings.weeklyDigest}
                onCheckedChange={(value) => handleNotificationChange('weeklyDigest', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="new-features">New Features</Label>
                <p className="text-sm text-gray-600">Be the first to know about new features</p>
              </div>
              <Switch 
                id="new-features"
                checked={notificationSettings.newFeatures}
                onCheckedChange={(value) => handleNotificationChange('newFeatures', value)}
              />
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
              <Switch 
                id="data-retention"
                checked={privacySettings.dataRetention}
                onCheckedChange={(value) => handlePrivacyChange('dataRetention', value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="analytics">Anonymous Analytics</Label>
                <p className="text-sm text-gray-600">Help us improve by sharing anonymous usage data</p>
              </div>
              <Switch 
                id="analytics"
                checked={privacySettings.analytics}
                onCheckedChange={(value) => handlePrivacyChange('analytics', value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Change Password</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={handleChangePassword}
                disabled={saving === 'password'}
              >
                {saving === 'password' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
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
              <Button 
                variant="outline"
                onClick={() => handleExportData('json')}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  'Export All Data (JSON)'
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleExportData('csv')}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  'Export All Data (CSV)'
                )}
              </Button>
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
            <Button 
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={saving === 'delete-account'}
            >
              {saving === 'delete-account' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
} 