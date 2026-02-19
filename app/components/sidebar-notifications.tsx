"use client";

import { useState, useEffect } from 'react';
import { Bell, Check, X, Calendar, Users, Phone } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  type: 'in_app';
  subject?: string;
  message: string;
  status: 'sent' | 'pending' | 'failed';
  sentAt?: string;
  createdAt: string;
  readAt?: string;
  eventType?: string;
  eventId?: number;
  metadata?: string;
}

interface SidebarNotificationsProps {
  className?: string;
}

export function SidebarNotifications({ className }: SidebarNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { userRole } = useUserScope();

  // Show notifications to small group leaders and university scope users
  const shouldShowNotifications = userRole === 'smallgroup' || userRole === 'university';

  // Fetch unread count only
  const fetchUnreadCount = async () => {
    if (!shouldShowNotifications) return;
    
    try {
      const response = await fetch('/api/notifications?limit=1&unreadOnly=true');
      const data = await response.json();
      
      if (data.pagination) {
        setUnreadCount(data.pagination.total);
        console.log(`🔔 Unread notifications count: ${data.pagination.total}`);
      } else if (data.notifications) {
        setUnreadCount(data.notifications.length);
        console.log(`🔔 Unread notifications count: ${data.notifications.length}`);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!shouldShowNotifications) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications?limit=5&unreadOnly=false');
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
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Refresh unread count
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
      
      // Refresh unread count
      fetchUnreadCount();
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
      
      // Refresh unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    if (shouldShowNotifications) {
      // Fetch unread count immediately on mount
      fetchUnreadCount();
      
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      
      return () => clearInterval(interval);
    }
  }, [shouldShowNotifications]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (isOpen && shouldShowNotifications) {
      fetchNotifications();
    }
  }, [isOpen, shouldShowNotifications]);

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

  // Don't render if user is not a small group leader
  if (!shouldShowNotifications) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative h-8 w-8", className)}>
          <Bell className={cn("h-4 w-4", unreadCount > 0 && "animate-pulse text-primary", "text-muted-foreground")} />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px] font-medium animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-hidden bg-background border-border shadow-lg">
        <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
          <h3 className="font-medium text-sm text-foreground">
            {userRole === 'university' ? 'Event Acknowledgments' : 'Attendance Alerts'}
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
        
        <div className="overflow-y-auto max-h-[350px] scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {userRole === 'university' ? 'No event acknowledgments' : 'No attendance alerts'}
            </div>
          ) : (
            notifications.map((notification) => {
            const metadata = parseMetadata(notification.metadata);
            const isUnread = !notification.readAt;
            
            return (
              <div key={notification.id} className="border-b border-border/50 last:border-b-0">
                <div 
                  className={cn(
                    "p-2 cursor-pointer hover:bg-muted/20 transition-colors",
                    isUnread && "bg-muted/10 border-l-2 border-l-primary"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {/* Hide badges for university users */}
                      {userRole !== 'university' && (
                        <>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            Attendance Alert
                          </Badge>
                          <Badge 
                            variant={notification.status === 'sent' ? 'default' : notification.status === 'pending' ? 'secondary' : 'destructive'}
                            className="text-[10px] h-4 px-1"
                          >
                            {notification.status}
                          </Badge>
                        </>
                      )}
                      {isUnread && (
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-xs mb-1">
                        {notification.subject || 'Attendance Alert'}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                    </div>
                    
                    {metadata && notification.eventType === 'attendance_miss' && userRole === 'smallgroup' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(metadata.eventDate).toLocaleDateString()}</span>
                          <Users className="h-3 w-3 ml-2" />
                          <span>{metadata.totalAbsent} absent</span>
                        </div>
                        
                        {metadata.absentMembers && metadata.absentMembers.length > 0 && (
                          <div className="bg-muted/30 rounded-md p-1.5">
                            <div className="text-[10px] font-medium mb-1 text-muted-foreground">Absent Members:</div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[10px]">
                                <thead>
                                  <tr className="border-b border-border/50">
                                    <th className="text-left py-0.5 px-1 font-medium text-muted-foreground">Name</th>
                                    <th className="text-left py-0.5 px-1 font-medium text-muted-foreground">Phone</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {metadata.absentMembers.slice(0, 4).map((member: any, index: number) => (
                                    <tr key={index} className="border-b border-border/30 last:border-b-0">
                                      <td className="py-0.5 px-1 text-xs">{member.name}</td>
                                      <td className="py-0.5 px-1">
                                        {member.phone && member.phone !== 'N/A' ? (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-3 w-3 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(`tel:${member.phone}`);
                                            }}
                                          >
                                            <Phone className="h-3 w-3" />
                                          </Button>
                                        ) : (
                                          <span className="text-muted-foreground">N/A</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {metadata.absentMembers.length > 4 && (
                                <div className="text-[10px] text-muted-foreground mt-1 text-center">
                                  +{metadata.absentMembers.length - 4} more members
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {metadata && notification.eventType === 'university_acknowledgment' && userRole === 'university' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(metadata.eventDate).toLocaleDateString()}</span>
                          <Users className="h-3 w-3 ml-2" />
                          <span>{metadata.totalAcknowledgedGroups} group{metadata.totalAcknowledgedGroups > 1 ? 's' : ''} acknowledged</span>
                        </div>
                        
                        {metadata.acknowledgedSmallGroups && metadata.acknowledgedSmallGroups.length > 0 && (
                          <div className="bg-muted/30 rounded-md p-1.5">
                            <div className="text-[10px] font-medium mb-1 text-muted-foreground">Acknowledged Small Groups:</div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[10px]">
                                <thead>
                                  <tr className="border-b border-border/50">
                                    <th className="text-left py-0.5 px-1 font-medium text-muted-foreground">Small Group</th>
                                    <th className="text-left py-0.5 px-1 font-medium text-muted-foreground">Leader</th>
                                    <th className="text-left py-0.5 px-1 font-medium text-muted-foreground">Absent</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {metadata.acknowledgedSmallGroups.slice(0, 4).map((group: any, index: number) => (
                                    <tr key={index} className="border-b border-border/30 last:border-b-0">
                                      <td className="py-0.5 px-1 text-xs">{group.smallGroupName}</td>
                                      <td className="py-0.5 px-1 text-xs">{group.smallGroupLeaderName}</td>
                                      <td className="py-0.5 px-1 text-xs">{group.totalAbsent}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {metadata.acknowledgedSmallGroups.length > 4 && (
                                <div className="text-[10px] text-muted-foreground mt-1 text-center">
                                  +{metadata.acknowledgedSmallGroups.length - 4} more groups
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span>{formatTime(notification.createdAt)}</span>
                      
                      <div className="flex items-center gap-1">
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="h-2.5 w-2.5 mr-0.5" />
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-1.5">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-center h-7 text-xs"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page
                  window.location.href = '/links/admin/notifications';
                }}
              >
                View All Notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
