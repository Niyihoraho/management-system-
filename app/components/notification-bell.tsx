"use client";

import { useState, useEffect } from 'react';
import { Bell, Check, X, Eye, Phone, Mail, Calendar, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useUserScope } from "@/components/role-based-access";

interface Notification {
  id: number;
  type: 'email' | 'sms' | 'in_app';
  subject?: string;
  message: string;
  status: 'sent' | 'pending' | 'failed';
  sentAt?: string;
  createdAt: string;
  readAt?: string;
  eventType?: string;
  eventId?: number;
  metadata?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    username?: string;
  };
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { userRole } = useUserScope();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications?limit=10&unreadOnly=false');
      const data = await response.json();
      
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.readAt).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unread count only
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications?limit=1&unreadOnly=true');
      const data = await response.json();
      
      if (data.pagination) {
        setUnreadCount(data.pagination.total);
      } else if (data.notifications) {
        setUnreadCount(data.notifications.length);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          readAt: new Date().toISOString(),
          status: 'read'
        })
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { 
            ...n, 
            readAt: new Date().toISOString(),
            status: 'marked'
          } : n
        )
      );
      
      // Decrease unread count by 1
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Refresh unread count to ensure accuracy
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.readAt);
      await Promise.all(
        unreadNotifications.map(n => markAsRead(n.id))
      );
      // Reset unread count to 0 after marking all as read
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const deletedNotification = notifications.find(n => n.id === notificationId);
        return deletedNotification && !deletedNotification.readAt ? prev - 1 : prev;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Parse notification metadata
  const parseMetadata = (metadata?: string) => {
    if (!metadata) return null;
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  };

  // Format notification time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto bg-background border-border">
        <div className="flex items-center justify-between p-2 border-b border-border bg-muted/50">
          <h3 className="font-semibold text-sm text-foreground">
            {userRole === 'university' ? 'Event Acknowledgments' : 'Notifications'}
          </h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs h-6 px-2 text-foreground hover:bg-background/80"
            >
              Mark all read
            </Button>
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => {
            const metadata = parseMetadata(notification.metadata);
            const isUnread = !notification.readAt;
            
            return (
              <div key={notification.id} className="border-b last:border-b-0">
                <div 
                  className={cn(
                    "p-3 hover:bg-muted/30 cursor-pointer",
                    isUnread && "bg-muted/20 border-l-4 border-l-primary"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Hide badges for university users */}
                        {userRole !== 'university' && (
                          <Badge 
                            variant={notification.type === 'in_app' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {notification.type === 'in_app' ? 'In-App' : notification.type.toUpperCase()}
                          </Badge>
                        )}
                        {isUnread && (
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                      </div>
                      
                      <h4 className="font-medium text-sm mb-1 line-clamp-1">
                        {notification.subject || 'Notification'}
                      </h4>
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      {metadata && notification.eventType === 'attendance_miss' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(metadata.eventDate).toLocaleDateString()}</span>
                            <Users className="h-3 w-3 ml-2" />
                            <span>{metadata.totalAbsent} absent</span>
                          </div>
                          
                          {metadata.absentMembers && metadata.absentMembers.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <div className="font-medium mb-1">Absent Members:</div>
                              <div className="space-y-1">
                                {metadata.absentMembers.slice(0, 3).map((member: any, index: number) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <span>{member.name}</span>
                                    {member.phone && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(`tel:${member.phone}`);
                                        }}
                                      >
                                        <Phone className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                {metadata.absentMembers.length > 3 && (
                                  <div className="text-muted-foreground">
                                    +{metadata.absentMembers.length - 3} more
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-center"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page
                  window.location.href = '/links/admin/notifications';
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View All Notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
