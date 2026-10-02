import { useNavigate } from 'react-router-dom'
import { User, Mail, Calendar, Shield, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { formatDate } from '@/lib/format'

export function ProfileSettingsCard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Signed out successfully')
      navigate('/login')
    } catch {
      navigate('/login')
    }
  }

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader>
        <CardTitle className="text-base">User Profile</CardTitle>
        <CardDescription className="text-xs">
          Your authenticated developer identity and account information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
              <User className="size-3.5" /> Full Name
            </Label>
            <Input value={user.name} readOnly className="bg-muted/30 text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
              <Mail className="size-3.5" /> Email Address
            </Label>
            <Input value={user.email} readOnly className="bg-muted/30 text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="size-3.5" /> Account Created
            </Label>
            <Input value={user.created_at ? formatDate(user.created_at) : 'Active'} readOnly className="bg-muted/30 text-xs font-mono" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
              <Shield className="size-3.5" /> Account Status
            </Label>
            <Input value="Active · Verified" readOnly className="bg-muted/30 text-xs text-emerald-500 font-medium" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t border-border/40 pt-4 flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Sign out of your active session</p>
        <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-2 text-xs">
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </CardFooter>
    </Card>
  )
}
