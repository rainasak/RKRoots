import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { samePersonLinkService, AccessRequest } from '../../services/samePersonLinkService';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type AccessRequestsScreenNavigationProp = StackNavigationProp<MainStackParamList, 'AccessRequests'>;
type AccessRequestsScreenRouteProp = RouteProp<MainStackParamList, 'AccessRequests'>;

interface AccessRequestsScreenProps {
  navigation: AccessRequestsScreenNavigationProp;
  route: AccessRequestsScreenRouteProp;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return '#ffc107';
    case 'approved':
      return '#28a745';
    case 'denied':
      return '#dc3545';
    default:
      return '#6c757d';
  }
};

export const AccessRequestsScreen: React.FC<AccessRequestsScreenProps> = ({ route }) => {
  const { treeId, treeName } = route.params;
  const queryClient = useQueryClient();

  const { data: requests, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['accessRequests', treeId],
    queryFn: () => samePersonLinkService.getAccessRequests(treeId),
  });

  const approveMutation = useMutation({
    mutationFn: ({ requestId, level }: { requestId: string; level: 'viewer' | 'editor' }) =>
      samePersonLinkService.approveAccessRequest(requestId, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessRequests', treeId] });
      Alert.alert('Success', 'Access request approved');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to approve request');
    },
  });

  const denyMutation = useMutation({
    mutationFn: (requestId: string) => samePersonLinkService.denyAccessRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessRequests', treeId] });
      Alert.alert('Success', 'Access request denied');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to deny request');
    },
  });

  const handleApprove = (request: AccessRequest) => {
    Alert.alert(
      'Approve Access Request',
      `Grant ${request.userDisplayName || 'User'} access to "${treeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Viewer Access',
          onPress: () => approveMutation.mutate({ requestId: request.requestId, level: 'viewer' }),
        },
        {
          text: 'Editor Access',
          onPress: () => approveMutation.mutate({ requestId: request.requestId, level: 'editor' }),
        },
      ]
    );
  };

  const handleDeny = (request: AccessRequest) => {
    Alert.alert(
      'Deny Access Request',
      `Deny ${request.userDisplayName || 'User'}'s request to access "${treeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deny', style: 'destructive', onPress: () => denyMutation.mutate(request.requestId) },
      ]
    );
  };

  const renderRequest = ({ item }: { item: AccessRequest }) => {
    const isPending = item.status === 'pending';

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(item.userDisplayName || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.userDisplayName || 'Unknown User'}</Text>
            <Text style={styles.userEmail}>{item.userEmail}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.requestDetails}>
          <Text style={styles.detailText}>
            Requested: <Text style={styles.detailValue}>{item.requestedLevel}</Text> access
          </Text>
          <Text style={styles.detailText}>
            Date: <Text style={styles.detailValue}>{formatDate(item.requestedAt)}</Text>
          </Text>
        </View>

        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.denyButton]}
              onPress={() => handleDeny(item)}
              disabled={denyMutation.isPending}
            >
              <Text style={styles.denyButtonText}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item)}
              disabled={approveMutation.isPending}
            >
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
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

  const pendingRequests = requests?.filter((r) => r.status === 'pending') || [];
  const resolvedRequests = requests?.filter((r) => r.status !== 'pending') || [];

  return (
    <View style={styles.container}>
      <FlatList
        data={[...pendingRequests, ...resolvedRequests]}
        keyExtractor={(item) => item.requestId}
        renderItem={renderRequest}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListHeaderComponent={
          pendingRequests.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📬</Text>
            <Text style={styles.emptyText}>No access requests</Text>
            <Text style={styles.emptySubtext}>
              When someone requests access to this tree, it will appear here
            </Text>
          </View>
        }
      />
    </View>
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
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  requestDetails: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  denyButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  denyButtonText: {
    color: '#dc3545',
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
