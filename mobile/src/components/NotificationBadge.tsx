import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';

interface NotificationBadgeProps {
  onPress: () => void;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ onPress }) => {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotificationCount'],
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 30000,
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.icon}>🔔</Text>
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 16,
    position: 'relative',
  },
  icon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
