import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { timelineService } from '../../services/timelineService';
import { EventType, TimelineEvent } from '../../types';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type TimelineScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Timeline'>;
type TimelineScreenRouteProp = RouteProp<MainStackParamList, 'Timeline'>;

interface TimelineScreenProps {
  navigation: TimelineScreenNavigationProp;
  route: TimelineScreenRouteProp;
}

const EVENT_TYPE_FILTERS: { value: EventType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📋' },
  { value: EventType.BIRTH, label: 'Birth', icon: '👶' },
  { value: EventType.MARRIAGE, label: 'Marriage', icon: '💒' },
  { value: EventType.DEATH, label: 'Death', icon: '🕯️' },
  { value: EventType.MILESTONE, label: 'Milestone', icon: '🎯' },
  { value: EventType.ACHIEVEMENT, label: 'Achievement', icon: '🏆' },
  { value: EventType.MEMORY, label: 'Memory', icon: '📸' },
];

const getEventTypeColor = (eventType: EventType): string => {
  const colors: Record<EventType, string> = {
    [EventType.BIRTH]: '#4CAF50',
    [EventType.MARRIAGE]: '#E91E63',
    [EventType.DEATH]: '#607D8B',
    [EventType.MILESTONE]: '#FF9800',
    [EventType.ACHIEVEMENT]: '#9C27B0',
    [EventType.MEMORY]: '#2196F3',
  };
  return colors[eventType] || '#007AFF';
};

const getEventTypeIcon = (eventType: EventType): string => {
  const icons: Record<EventType, string> = {
    [EventType.BIRTH]: '👶',
    [EventType.MARRIAGE]: '💒',
    [EventType.DEATH]: '🕯️',
    [EventType.MILESTONE]: '🎯',
    [EventType.ACHIEVEMENT]: '🏆',
    [EventType.MEMORY]: '📸',
  };
  return icons[eventType] || '📅';
};

export const TimelineScreen: React.FC<TimelineScreenProps> = ({ route, navigation }) => {
  const { treeId } = route.params;
  const [selectedFilter, setSelectedFilter] = useState<EventType | 'all'>('all');

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['timeline', treeId],
    queryFn: () => timelineService.getEvents(treeId),
  });

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (selectedFilter === 'all') return events;
    return events.filter((event: TimelineEvent) => event.eventType === selectedFilter);
  }, [events, selectedFilter]);

  const renderEventCard = ({ item }: { item: TimelineEvent }) => {
    const typeColor = getEventTypeColor(item.eventType);
    const typeIcon = getEventTypeIcon(item.eventType);

    return (
      <TouchableOpacity style={styles.eventCard} activeOpacity={0.7}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventTypeBadge, { backgroundColor: typeColor }]}>
            <Text style={styles.eventTypeIcon}>{typeIcon}</Text>
            <Text style={styles.eventTypeText}>
              {item.eventType.charAt(0).toUpperCase() + item.eventType.slice(1)}
            </Text>
          </View>
          <Text style={styles.eventDate}>
            {new Date(item.eventDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <Text style={styles.eventTitle}>{item.title}</Text>
        {item.location && (
          <Text style={styles.eventLocation}>📍 {item.location}</Text>
        )}
        {item.description && (
          <Text style={styles.eventDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load timeline</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {EVENT_TYPE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                selectedFilter === filter.value && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedFilter(filter.value)}
            >
              <Text style={styles.filterIcon}>{filter.icon}</Text>
              <Text
                style={[
                  styles.filterLabel,
                  selectedFilter === filter.value && styles.filterLabelSelected,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>
            {selectedFilter === 'all' ? 'No events yet' : `No ${selectedFilter} events`}
          </Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button to add your first timeline event
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item: TimelineEvent) => item.eventId}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEvent', { treeId })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#007AFF',
  },
  filterIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
  },
  filterLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  eventTypeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  eventTypeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
});
