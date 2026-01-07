import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { treeService, TreeAccessWithUser } from '../../services/treeService';
import { AccessLevel } from '../../types';
import type { RootState } from '../../store';

interface ShareTreeScreenProps {
  route: { params: { treeId: string; treeName: string } };
  navigation: { goBack: () => void };
}

const ACCESS_LEVEL_OPTIONS: { value: AccessLevel; label: string; description: string }[] = [
  { value: AccessLevel.VIEWER, label: 'Viewer', description: 'Can view tree and members' },
  { value: AccessLevel.EDITOR, label: 'Editor', description: 'Can add and edit members' },
];

export const ShareTreeScreen: React.FC<ShareTreeScreenProps> = ({ route }) => {
  const { treeId, treeName } = route.params;
  const queryClient = useQueryClient();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [email, setEmail] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<AccessLevel>(AccessLevel.VIEWER);
  const [showLevelPicker, setShowLevelPicker] = useState(false);

  const { data: accessList = [], isLoading } = useQuery({
    queryKey: ['treeAccess', treeId],
    queryFn: () => treeService.getTreeAccess(treeId),
  });

  const grantMutation = useMutation({
    mutationFn: (data: { email: string; accessLevel: AccessLevel }) =>
      treeService.grantAccess(treeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treeAccess', treeId] });
      setEmail('');
      Alert.alert('Success', 'Access granted successfully');
    },
    onError: (err: any) => {
      const message = err.response?.data?.error?.message || 'Failed to grant access';
      Alert.alert('Error', message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => treeService.revokeAccess(treeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treeAccess', treeId] });
      Alert.alert('Success', 'Access revoked');
    },
    onError: (err: any) => {
      const message = err.response?.data?.error?.message || 'Failed to revoke access';
      Alert.alert('Error', message);
    },
  });

  const handleInvite = () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    grantMutation.mutate({ email: trimmedEmail, accessLevel: selectedLevel });
  };

  const handleRevoke = (user: TreeAccessWithUser) => {
    Alert.alert(
      'Revoke Access',
      `Remove ${user.displayName}'s access to this tree?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => revokeMutation.mutate(user.userId) },
      ]
    );
  };

  const handleChangeAccess = (user: TreeAccessWithUser, newLevel: AccessLevel) => {
    grantMutation.mutate({ email: user.email, accessLevel: newLevel });
  };

  const getAccessLevelColor = (level: AccessLevel): string => {
    switch (level) {
      case AccessLevel.OWNER: return '#9c27b0';
      case AccessLevel.EDITOR: return '#28a745';
      case AccessLevel.VIEWER: return '#007AFF';
      default: return '#666';
    }
  };

  const renderAccessItem = ({ item }: { item: TreeAccessWithUser }) => {
    const isOwner = item.accessLevel === AccessLevel.OWNER;
    const isCurrentUser = item.userId === currentUser?.userId;

    return (
      <View style={styles.accessItem}>
        <View style={styles.accessInfo}>
          <Text style={styles.accessName}>{item.displayName}</Text>
          <Text style={styles.accessEmail}>{item.email}</Text>
        </View>
        <View style={styles.accessActions}>
          <View style={[styles.levelBadge, { backgroundColor: getAccessLevelColor(item.accessLevel) }]}>
            <Text style={styles.levelBadgeText}>
              {item.accessLevel.charAt(0).toUpperCase() + item.accessLevel.slice(1)}
            </Text>
          </View>
          {!isOwner && !isCurrentUser && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => {
                  const newLevel = item.accessLevel === AccessLevel.VIEWER 
                    ? AccessLevel.EDITOR 
                    : AccessLevel.VIEWER;
                  handleChangeAccess(item, newLevel);
                }}
              >
                <Text style={styles.changeButtonText}>
                  {item.accessLevel === AccessLevel.VIEWER ? '↑' : '↓'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.revokeButton}
                onPress={() => handleRevoke(item)}
              >
                <Text style={styles.revokeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.treeName}>{treeName}</Text>
        <Text style={styles.subtitle}>Manage who can access this tree</Text>
      </View>

      <View style={styles.inviteSection}>
        <Text style={styles.sectionTitle}>Invite Someone</Text>
        <View style={styles.inviteRow}>
          <TextInput
            style={styles.emailInput}
            placeholder="Enter email address"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>Access Level:</Text>
          <TouchableOpacity
            style={styles.levelSelector}
            onPress={() => setShowLevelPicker(!showLevelPicker)}
          >
            <Text style={styles.levelSelectorText}>
              {ACCESS_LEVEL_OPTIONS.find(o => o.value === selectedLevel)?.label}
            </Text>
            <Text style={styles.levelSelectorArrow}>{showLevelPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>
        {showLevelPicker && (
          <View style={styles.levelOptions}>
            {ACCESS_LEVEL_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.levelOption,
                  selectedLevel === option.value && styles.levelOptionSelected,
                ]}
                onPress={() => {
                  setSelectedLevel(option.value);
                  setShowLevelPicker(false);
                }}
              >
                <Text style={[
                  styles.levelOptionLabel,
                  selectedLevel === option.value && styles.levelOptionLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.levelOptionDesc}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={[styles.inviteButton, grantMutation.isPending && styles.inviteButtonDisabled]}
          onPress={handleInvite}
          disabled={grantMutation.isPending}
        >
          {grantMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.inviteButtonText}>Send Invitation</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Current Access ({accessList.length})</Text>
        <FlatList
          data={accessList}
          keyExtractor={item => item.accessId}
          renderItem={renderAccessItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No one has access yet</Text>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  treeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  inviteSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  inviteRow: {
    marginBottom: 12,
  },
  emailInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    marginRight: 12,
  },
  levelSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  levelSelectorText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  levelSelectorArrow: {
    fontSize: 12,
    color: '#666',
  },
  levelOptions: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  levelOption: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  levelOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  levelOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  levelOptionLabelSelected: {
    color: '#007AFF',
  },
  levelOptionDesc: {
    fontSize: 13,
    color: '#666',
  },
  inviteButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listSection: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  accessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  accessInfo: {
    flex: 1,
  },
  accessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  accessEmail: {
    fontSize: 13,
    color: '#666',
  },
  accessActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  levelBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  changeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  revokeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revokeButtonText: {
    fontSize: 14,
    color: '#dc3545',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 20,
  },
});
