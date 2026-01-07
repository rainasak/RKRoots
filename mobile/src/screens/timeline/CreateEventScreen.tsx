import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { timelineService } from '../../services/timelineService';
import { EventType } from '../../types';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type CreateEventScreenNavigationProp = StackNavigationProp<MainStackParamList, 'CreateEvent'>;
type CreateEventScreenRouteProp = RouteProp<MainStackParamList, 'CreateEvent'>;

interface CreateEventScreenProps {
  navigation: CreateEventScreenNavigationProp;
  route: CreateEventScreenRouteProp;
}

const EVENT_TYPE_OPTIONS: { value: EventType; label: string; icon: string }[] = [
  { value: EventType.BIRTH, label: 'Birth', icon: '👶' },
  { value: EventType.MARRIAGE, label: 'Marriage', icon: '💒' },
  { value: EventType.DEATH, label: 'Death', icon: '🕯️' },
  { value: EventType.MILESTONE, label: 'Milestone', icon: '🎯' },
  { value: EventType.ACHIEVEMENT, label: 'Achievement', icon: '🏆' },
  { value: EventType.MEMORY, label: 'Memory', icon: '📸' },
];

export const CreateEventScreen: React.FC<CreateEventScreenProps> = ({ navigation, route }) => {
  const { treeId } = route.params;
  const [eventType, setEventType] = useState<EventType>(EventType.MILESTONE);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const createEventMutation = useMutation({
    mutationFn: (data: Parameters<typeof timelineService.createEvent>[1]) =>
      timelineService.createEvent(treeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', treeId] });
      navigation.goBack();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to create event');
    },
  });

  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr.trim()) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  const handleCreate = () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!isValidDate(eventDate)) {
      setError('Valid date is required (YYYY-MM-DD)');
      return;
    }
    setError('');

    const eventData: Parameters<typeof timelineService.createEvent>[1] = {
      eventType,
      title: title.trim(),
      eventDate: eventDate.trim(),
      participantIds: [],
    };

    if (description.trim()) eventData.description = description.trim();
    if (location.trim()) eventData.location = location.trim();

    createEventMutation.mutate(eventData);
  };

  const isLoading = createEventMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Event Type *</Text>
        <View style={styles.typeGrid}>
          {EVENT_TYPE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.typeOption,
                eventType === option.value && styles.typeOptionSelected,
              ]}
              onPress={() => setEventType(option.value)}
              disabled={isLoading}
            >
              <Text style={styles.typeIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  eventType === option.value && styles.typeLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., John's Wedding"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          editable={!isLoading}
          maxLength={255}
        />

        <Text style={styles.label}>Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
          value={eventDate}
          onChangeText={setEventDate}
          editable={!isLoading}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Location (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., New York, NY"
          placeholderTextColor="#999"
          value={location}
          onChangeText={setLocation}
          editable={!isLoading}
          maxLength={255}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add details about this event..."
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!isLoading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Event</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  typeOption: {
    width: '31%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  typeOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textArea: {
    minHeight: 100,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  error: {
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});
