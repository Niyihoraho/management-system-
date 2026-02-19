"use client";

import { useState, useEffect } from 'react';
import { Bell, Check, X, Eye, Phone, Mail, Calendar, Users, Filter, Search, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
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

interface NotificationsPageProps {
  className?: string;
}

export function NotificationsPage({ className }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const { userRole } = useUserScope();
  const [filters, setFilters] = useState({
    status: 'all',
    eventType: 'all',
    unreadOnly: false,
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.eventType !== 'all' && { eventType: filters.eventType }),
        ...(filters.unreadOnly && { unreadOnly: 'true' }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();
      
      if (data.notifications) {
        setNotifications(data.notifications);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }));
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
          status: 'marked'
        })
      });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { 
            ...n, 
            readAt: new Date().toISOString(),
            status: 'marked'
          } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark selected as read
  const markSelectedAsRead = async () => {
    try {
      await Promise.all(
        selectedNotifications.map(id => markAsRead(id))
      );
      setSelectedNotifications([]);
    } catch (error) {
      console.error('Error marking selected as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Delete selected notifications
  const deleteSelected = async () => {
    try {
      await Promise.all(
        selectedNotifications.map(id => deleteNotification(id))
      );
      setSelectedNotifications([]);
    } catch (error) {
      console.error('Error deleting selected notifications:', error);
    }
  };

  // Select all notifications
  const selectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n.id));
    }
  };

  // Toggle notification selection
  const toggleSelection = (notificationId: number) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

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

  // Fetch notifications when filters change
  useEffect(() => {
    fetchNotifications();
  }, [filters, pagination.page]);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All notifications read'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotifications}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Event Type</label>
              <Select value={filters.eventType} onValueChange={(value) => setFilters(prev => ({ ...prev, eventType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="attendance_miss">Attendance Miss</SelectItem>
                  <SelectItem value="university_acknowledgment">University Acknowledgment</SelectItem>
                  <SelectItem value="event_reminder">Event Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unreadOnly"
                  checked={filters.unreadOnly}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, unreadOnly: !!checked }))}
                />
                <label htmlFor="unreadOnly" className="text-sm font-medium">
                  Unread only
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={markSelectedAsRead}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Read
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteSelected}>
                  <X className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Notifications</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                onCheckedChange={selectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {filters.unreadOnly ? 'No unread notifications' : 'No notifications found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const metadata = parseMetadata(notification.metadata);
                const isUnread = !notification.readAt;
                const isSelected = selectedNotifications.includes(notification.id);
                
                return (
                  <div 
                    key={notification.id} 
                    className={cn(
                      "border rounded-lg p-4 border-border",
                      isUnread && "bg-muted/20 border-l-4 border-l-primary",
                      isSelected && "bg-accent"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(notification.id)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {/* Hide badges for university users */}
                          {userRole !== 'university' && (
                            <>
                              <Badge 
                                variant={notification.type === 'in_app' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {notification.type === 'in_app' ? 'In-App' : notification.type.toUpperCase()}
                              </Badge>
                              <Badge 
                                variant={notification.status === 'sent' ? 'default' : notification.status === 'pending' ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {notification.status}
                              </Badge>
                            </>
                          )}
                          {isUnread && (
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          )}
                        </div>
                        
                        <h3 className="font-medium mb-1">
                          {notification.subject || 'Notification'}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {notification.message}
                        </p>
                        
                        {metadata && notification.eventType === 'attendance_miss' && userRole === 'smallgroup' && (
                          <div className="bg-muted/50 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 text-sm font-medium mb-3">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(metadata.eventDate).toLocaleDateString()}</span>
                              <Users className="h-4 w-4 ml-2" />
                              <span>{metadata.totalAbsent} member{metadata.totalAbsent > 1 ? 's' : ''} absent</span>
                            </div>
                            
                            {metadata.absentMembers && metadata.absentMembers.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium mb-2">Absent Members:</div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Name</th>
                                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Phone</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {metadata.absentMembers.map((member: any, index: number) => (
                                        <tr key={index} className="border-b last:border-b-0">
                                          <td className="py-2 px-3">{member.name}</td>
                                          <td className="py-2 px-3">
                                            {member.phone && member.phone !== 'N/A' ? (
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm">{member.phone}</span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6 p-0"
                                                  onClick={() => window.open(`tel:${member.phone}`)}
                                                >
                                                  <Phone className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ) : (
                                              <span className="text-muted-foreground">N/A</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {metadata && notification.eventType === 'university_acknowledgment' && userRole === 'university' && (
                          <div className="bg-muted/50 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 text-sm font-medium mb-3">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(metadata.eventDate).toLocaleDateString()}</span>
                              <Users className="h-4 w-4 ml-2" />
                              <span>{metadata.totalAcknowledgedGroups} group{metadata.totalAcknowledgedGroups > 1 ? 's' : ''} acknowledged</span>
                            </div>
                            
                            {metadata.acknowledgedSmallGroups && metadata.acknowledgedSmallGroups.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium mb-2">Acknowledged Small Groups:</div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Small Group</th>
                                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Leader</th>
                                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Absent</th>
                                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Acknowledged</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {metadata.acknowledgedSmallGroups.map((group: any, index: number) => (
                                        <tr key={index} className="border-b last:border-b-0">
                                          <td className="py-2 px-3">{group.smallGroupName}</td>
                                          <td className="py-2 px-3">{group.smallGroupLeaderName}</td>
                                          <td className="py-2 px-3">{group.totalAbsent}</td>
                                          <td className="py-2 px-3">{new Date(group.acknowledgedAt).toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatTime(notification.createdAt)}</span>
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Mark Read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-destructive"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
