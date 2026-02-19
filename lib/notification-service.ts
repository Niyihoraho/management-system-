import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/rls";

export interface AbsentMember {
  id: number;
  firstname: string | null;
  secondname: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface AttendanceNotificationData {
  eventId: number;
  eventType: 'permanent' | 'training';
  eventName: string;
  eventDate: Date;
  absentMembers: AbsentMember[];
  smallGroupId?: number;
  universityId?: number;
  regionId?: number;
}

/**
 * Service for handling attendance notifications
 */
export class NotificationService {

  /**
   * Send attendance notifications to ALL small group leaders in the university
   * Each leader sees only their own absent members
   */
  static async sendAttendanceNotifications(data: AttendanceNotificationData): Promise<void> {
    try {
      console.log('🔔 Sending attendance notifications for event:', data.eventName);
      console.log(`📊 Event details - University: ${data.universityId}, Region: ${data.regionId}`);

      // Get ALL small groups that belong to the university
      const universitySmallGroups = await this.getUniversitySmallGroups(data.universityId!);

      if (universitySmallGroups.length === 0) {
        console.log('⚠️ No small groups found in university:', data.universityId);
        return;
      }

      console.log(`📊 Found ${universitySmallGroups.length} small groups in university ${data.universityId}`);

      // For each small group, find their absent members and send notifications
      const notificationPromises = universitySmallGroups.map(smallGroup =>
        this.sendNotificationsToSmallGroup(smallGroup, data)
      );

      await Promise.all(notificationPromises);

      console.log(`✅ Processed notifications for ${universitySmallGroups.length} small groups`);

    } catch (error) {
      console.error('❌ Error sending attendance notifications:', error);
      throw error;
    }
  }

  /**
   * Get all small groups that belong to a university
   */
  private static async getUniversitySmallGroups(universityId: number): Promise<Array<{ id: number, name: string }>> {
    const smallGroups = await prisma.smallGroup.findMany({
      where: {
        universityId: universityId
      },
      select: {
        id: true,
        name: true
      }
    });

    return smallGroups;
  }

  /**
   * Send notifications to a specific small group about their absent members
   */
  private static async sendNotificationsToSmallGroup(
    smallGroup: { id: number, name: string },
    data: AttendanceNotificationData
  ): Promise<void> {
    try {
      // Get all members of this small group who were absent from the event
      const absentMembersInThisGroup = await this.getAbsentMembersForSmallGroup(smallGroup.id, data.eventId, data.eventType);

      // Only send notification if there are absent members in this small group
      if (absentMembersInThisGroup.length === 0) {
        console.log(`✅ Small group "${smallGroup.name}" - No absent members`);
        return;
      }

      console.log(`📊 Small group "${smallGroup.name}" - ${absentMembersInThisGroup.length} absent members`);

      // Get small group leaders
      const smallGroupLeaders = await prisma.userRole.findMany({
        where: {
          smallGroupId: smallGroup.id,
          scope: 'smallgroup'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (smallGroupLeaders.length === 0) {
        console.log(`⚠️ No leaders found for small group "${smallGroup.name}"`);
        return;
      }

      // Create notification data specific to this small group
      const smallGroupNotificationData = {
        ...data,
        smallGroupId: smallGroup.id,
        absentMembers: absentMembersInThisGroup
      };

      // Send notifications to all leaders of this small group
      const notificationPromises = smallGroupLeaders.map(leader =>
        this.createAttendanceNotification(leader.user.id, smallGroupNotificationData)
      );

      await Promise.all(notificationPromises);

      console.log(`✅ Sent notifications to ${smallGroupLeaders.length} leaders of small group "${smallGroup.name}"`);

    } catch (error) {
      console.error(`❌ Error sending notifications to small group ${smallGroup.name}:`, error);
      throw error;
    }
  }

  /**
   * Get absent members for a specific small group from a specific event
   */
  private static async getAbsentMembersForSmallGroup(
    smallGroupId: number,
    eventId: number,
    eventType: 'permanent' | 'training'
  ): Promise<AbsentMember[]> {
    // Get all members of this small group
    const smallGroupMembers = await prisma.member.findMany({
      where: {
        smallGroupId: smallGroupId,
        status: 'active' // Only active members
      },
      select: {
        id: true,
        firstname: true,
        secondname: true,
        phone: true,
        email: true
      }
    });

    // Get attendance records for this event
    const attendanceWhere: any = {
      status: 'absent'
    };

    if (eventType === 'permanent') {
      attendanceWhere.permanentEventId = eventId;
    } else {
      attendanceWhere.trainingId = eventId;
    }

    const absentAttendanceRecords = await prisma.attendance.findMany({
      where: attendanceWhere,
      include: {
        member: {
          select: {
            id: true,
            firstname: true,
            secondname: true,
            phone: true,
            email: true,
            smallGroupId: true
          }
        }
      }
    });

    // Filter to only include members from this small group who were absent
    const absentMembersInThisGroup = absentAttendanceRecords
      .filter(record => record.member.smallGroupId === smallGroupId)
      .map(record => ({
        id: record.member.id,
        firstname: record.member.firstname,
        secondname: record.member.secondname,
        phone: record.member.phone,
        email: record.member.email
      }));

    return absentMembersInThisGroup;
  }

  /**
   * Create attendance notification for a specific small group leader
   */
  private static async createAttendanceNotification(adminUserId: string, data: AttendanceNotificationData): Promise<void> {
    try {
      // Check if user has notification preferences enabled
      const preferences = await (prisma as any).notificationpreferences.findUnique({
        where: { userId: adminUserId }
      });

      // Skip if attendance alerts are disabled
      if (preferences && !preferences.attendanceAlerts) {
        console.log(`⏭️ Skipping notification for user ${adminUserId} - attendance alerts disabled`);
        return;
      }

      // Get small group data if smallGroupId is provided
      let smallGroupName = 'your small group';
      let smallGroup = null;
      if (data.smallGroupId) {
        smallGroup = await prisma.smallGroup.findUnique({
          where: { id: data.smallGroupId },
          select: {
            name: true,
            regionId: true,
            universityId: true
          }
        });
        if (smallGroup) {
          smallGroupName = smallGroup.name;
        }
      }

      // Create notification metadata with table-ready data
      const metadata = {
        eventId: data.eventId,
        eventType: data.eventType,
        eventName: data.eventName,
        eventDate: data.eventDate.toISOString(),
        smallGroupId: data.smallGroupId,
        smallGroupName: smallGroupName,
        absentMembers: data.absentMembers.map(member => ({
          id: member.id,
          name: `${member.firstname || 'Unknown'} ${member.secondname || ''}`.trim(),
          phone: member.phone || 'N/A'
        })),
        totalAbsent: data.absentMembers.length
      };

      // Debug logging for metadata and hierarchy
      console.log('Creating attendance notification with hierarchy data:', {
        smallGroupId: data.smallGroupId,
        smallGroupName: smallGroupName,
        regionId: smallGroup?.regionId || null,
        universityId: smallGroup?.universityId || null,
        metadata: JSON.stringify(metadata, null, 2)
      });

      // Create only in-app notification
      const notification = await (prisma as any).notification.create({
        data: {
          userId: adminUserId,
          type: 'in_app',
          subject: `Attendance Alert: ${data.eventName}`,
          message: `${data.absentMembers.length} member${data.absentMembers.length > 1 ? 's' : ''} from ${smallGroupName} missed the university event`,
          eventType: 'attendance_miss',
          eventId: data.eventId,
          metadata: JSON.stringify(metadata),
          status: 'sent',
          // ADD: Direct hierarchy fields for better RLS
          regionId: smallGroup?.regionId || null,
          universityId: smallGroup?.universityId || null,
          smallGroupId: data.smallGroupId || null,
          graduateGroupId: null
        }
      });

      console.log(`✅ Created notification ${notification.id} for user ${adminUserId} - ${data.absentMembers.length} absent members`);

    } catch (error) {
      console.error(`❌ Error creating notification for user ${adminUserId}:`, error);
      throw error;
    }
  }


  /**
   * Send notification to university when small group leader marks attendance notification as read
   */
  static async sendUniversityNotificationOnMarkRead(notificationId: number, smallGroupLeaderId: string): Promise<void> {
    try {
      console.log('🔔 Sending university notification for marked read notification:', notificationId);

      // Get the notification details
      const notification = await (prisma as any).notification.findUnique({
        where: { id: notificationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!notification || notification.eventType !== 'attendance_miss') {
        console.log('⚠️ Notification not found or not an attendance notification');
        return;
      }

      // Parse metadata to get event details
      const metadata = JSON.parse(notification.metadata || '{}');

      // Get the small group leader's role to find the university
      const smallGroupLeaderRole = await prisma.userRole.findFirst({
        where: {
          userId: smallGroupLeaderId,
          scope: 'smallgroup'
        },
        include: {
          smallGroup: {
            include: {
              university: {
                select: {
                  id: true,
                  name: true,
                  regionId: true
                }
              },
              region: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!smallGroupLeaderRole?.smallGroup?.university) {
        console.log('⚠️ Could not find university for small group leader');
        return;
      }

      const university = smallGroupLeaderRole.smallGroup.university;
      const region = smallGroupLeaderRole.smallGroup.region;

      // Get university leaders (users with university scope)
      const universityLeaders = await prisma.userRole.findMany({
        where: {
          universityId: university.id,
          scope: 'university'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (universityLeaders.length === 0) {
        console.log(`⚠️ No university leaders found for university: ${university.name}`);
        return;
      }

      // Check if there's already a university notification for this event
      const existingUniversityNotification = await (prisma as any).notification.findFirst({
        where: {
          eventId: notification.eventId,
          eventType: 'university_acknowledgment',
          userId: { in: universityLeaders.map(leader => leader.user.id) }
        }
      });

      if (existingUniversityNotification) {
        // Update existing notification to add this small group
        await this.updateUniversityAcknowledgmentNotification(existingUniversityNotification.id, {
          eventId: notification.eventId!,
          eventType: metadata.eventType,
          eventName: metadata.eventName,
          eventDate: new Date(metadata.eventDate),
          smallGroupName: smallGroupLeaderRole.smallGroup.name,
          smallGroupLeaderName: notification.user?.name || 'Unknown',
          absentMembers: metadata.absentMembers,
          totalAbsent: metadata.totalAbsent
        });
      } else {
        // Create new university notification
        const universityNotificationPromises = universityLeaders.map(leader =>
          this.createUniversityAcknowledgmentNotification(leader.user.id, {
            eventId: notification.eventId!,
            eventType: metadata.eventType,
            eventName: metadata.eventName,
            eventDate: new Date(metadata.eventDate),
            universityId: university.id,
            regionId: region?.id,
            smallGroupName: smallGroupLeaderRole.smallGroup.name,
            smallGroupLeaderName: notification.user?.name || 'Unknown',
            absentMembers: metadata.absentMembers,
            totalAbsent: metadata.totalAbsent
          })
        );

        await Promise.all(universityNotificationPromises);
      }

      console.log(`✅ Sent university acknowledgment notifications to ${universityLeaders.length} leaders for university: ${university.name}`);

    } catch (error) {
      console.error('❌ Error sending university notification:', error);
      throw error;
    }
  }

  /**
   * Create university acknowledgment notification showing small groups that have marked as read
   */
  private static async createUniversityAcknowledgmentNotification(leaderUserId: string, data: {
    eventId: number;
    eventType: string;
    eventName: string;
    eventDate: Date;
    universityId?: number;
    regionId?: number;
    smallGroupName: string;
    smallGroupLeaderName: string;
    absentMembers: any[];
    totalAbsent: number;
  }): Promise<void> {
    try {
      // Check if user has notification preferences enabled
      const preferences = await (prisma as any).notificationpreferences.findUnique({
        where: { userId: leaderUserId }
      });

      // Skip if attendance alerts are disabled
      if (preferences && !preferences.attendanceAlerts) {
        console.log(`⏭️ Skipping university notification for user ${leaderUserId} - attendance alerts disabled`);
        return;
      }

      // Create notification metadata with small group acknowledgment data
      const metadata = {
        eventId: data.eventId,
        eventType: data.eventType,
        eventName: data.eventName,
        eventDate: data.eventDate.toISOString(),
        universityId: data.universityId, // Add university ID for RLS filtering
        acknowledgedSmallGroups: [{
          smallGroupName: data.smallGroupName,
          smallGroupLeaderName: data.smallGroupLeaderName,
          totalAbsent: data.totalAbsent,
          acknowledgedAt: new Date().toISOString()
        }],
        totalAcknowledgedGroups: 1,
        notificationType: 'university_acknowledgment'
      };

      // Create in-app notification
      await (prisma as any).notification.create({
        data: {
          userId: leaderUserId,
          type: 'in_app',
          subject: `Event Acknowledgment: ${data.eventName}`,
          message: `${data.smallGroupName} has acknowledged ${data.totalAbsent} absent member${data.totalAbsent > 1 ? 's' : ''} from event "${data.eventName}"`,
          eventType: 'university_acknowledgment',
          eventId: data.eventId,
          metadata: JSON.stringify(metadata),
          status: 'sent',
          // ADD: Direct hierarchy fields for better RLS
          regionId: data.regionId || null,
          universityId: data.universityId || null,
          smallGroupId: null,
          graduateGroupId: null
        }
      });

      console.log(`✅ Created university acknowledgment notification for user ${leaderUserId}`);

    } catch (error) {
      console.error(`❌ Error creating university acknowledgment notification for user ${leaderUserId}:`, error);
      throw error;
    }
  }

  /**
   * Update existing university acknowledgment notification to add more small groups
   */
  private static async updateUniversityAcknowledgmentNotification(notificationId: number, data: {
    eventId: number;
    eventType: string;
    eventName: string;
    eventDate: Date;
    smallGroupName: string;
    smallGroupLeaderName: string;
    absentMembers: any[];
    totalAbsent: number;
  }): Promise<void> {
    try {
      // Get existing notification
      const existingNotification = await (prisma as any).notification.findUnique({
        where: { id: notificationId }
      });

      if (!existingNotification) {
        console.log('⚠️ Existing notification not found for update');
        return;
      }

      // Parse existing metadata
      const existingMetadata = JSON.parse(existingNotification.metadata || '{}');

      // Add new small group acknowledgment
      const newAcknowledgment = {
        smallGroupName: data.smallGroupName,
        smallGroupLeaderName: data.smallGroupLeaderName,
        totalAbsent: data.totalAbsent,
        acknowledgedAt: new Date().toISOString()
      };

      // Update metadata
      const updatedMetadata = {
        ...existingMetadata,
        acknowledgedSmallGroups: [...(existingMetadata.acknowledgedSmallGroups || []), newAcknowledgment],
        totalAcknowledgedGroups: (existingMetadata.totalAcknowledgedGroups || 0) + 1
      };

      // Update notification
      await (prisma as any).notification.update({
        where: { id: notificationId },
        data: {
          message: `${updatedMetadata.totalAcknowledgedGroups} small group${updatedMetadata.totalAcknowledgedGroups > 1 ? 's have' : ' has'} acknowledged absent members from event "${data.eventName}"`,
          metadata: JSON.stringify(updatedMetadata)
        }
      });

      console.log(`✅ Updated university acknowledgment notification ${notificationId} with new small group`);

    } catch (error) {
      console.error(`❌ Error updating university acknowledgment notification ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Get unread notification count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      return await (prisma as any).notification.count({
        where: {
          userId: userId,
          readAt: null
        }
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}
