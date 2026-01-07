import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { samePersonLinkService, LinkedTreeInfo } from '../services/samePersonLinkService';
import { RequestAccessModal } from './RequestAccessModal';

interface LinkedTreesSectionProps {
  nodeId: string;
  onNavigateToTree: (treeId: string) => void;
  onCreateLink: () => void;
}

export const LinkedTreesSection: React.FC<LinkedTreesSectionProps> = ({
  nodeId,
  onNavigateToTree,
  onCreateLink,
}) => {
  const queryClient = useQueryClient();
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedTree, setSelectedTree] = useState<LinkedTreeInfo | null>(null);

  const { data: linkedTreeInfo, isLoading } = useQuery({
    queryKey: ['linkedTreeInfo', nodeId],
    queryFn: () => samePersonLinkService.getLinkedTreeInfo(nodeId),
  });

  const requestAccessMutation = useMutation({
    mutationFn: ({ treeId, level }: { treeId: string; level: 'viewer' | 'editor' }) =>
      samePersonLinkService.submitAccessRequest(treeId, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedTreeInfo', nodeId] });
      setRequestModalVisible(false);
      setSelectedTree(null);
      Alert.alert('Request Sent', 'Your access request has been sent to the tree owner.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to send request');
    },
  });

  const handleTreePress = (tree: LinkedTreeInfo) => {
    if (tree.hasAccess) {
      onNavigateToTree(tree.linkedTreeId);
    } else if (tree.canRequestAccess) {
      setSelectedTree(tree);
      setRequestModalVisible(true);
    }
  };

  const handleRequestAccess = (level: 'viewer' | 'editor') => {
    if (selectedTree) {
      requestAccessMutation.mutate({ treeId: selectedTree.linkedTreeId, level });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  const hasLinkedTrees = linkedTreeInfo?.hasLinkedTree && linkedTreeInfo.linkedTrees.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>🔗 Linked Trees</Text>
        <TouchableOpacity style={styles.addButton} onPress={onCreateLink}>
          <Text style={styles.addButtonText}>+ Link</Text>
        </TouchableOpacity>
      </View>

      {hasLinkedTrees ? (
        <View style={styles.linkedTreesList}>
          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>
              This person also appears in {linkedTreeInfo.linkedTrees.length} other tree
              {linkedTreeInfo.linkedTrees.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {linkedTreeInfo.linkedTrees.map((tree) => (
            <TouchableOpacity
              key={tree.linkedTreeId}
              style={styles.linkedTreeItem}
              onPress={() => handleTreePress(tree)}
            >
              <View style={styles.treeIcon}>
                <Text style={styles.treeIconText}>🌳</Text>
              </View>
              <View style={styles.treeInfo}>
                <Text style={styles.treeName}>{tree.linkedTreeName}</Text>
                {tree.hasAccess ? (
                  <Text style={styles.accessStatus}>
                    {tree.userAccessLevel} access • Tap to view
                  </Text>
                ) : tree.hasPendingRequest ? (
                  <Text style={[styles.accessStatus, styles.pendingStatus]}>
                    Access request pending
                  </Text>
                ) : (
                  <Text style={[styles.accessStatus, styles.noAccessStatus]}>
                    Tap to request access
                  </Text>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No linked trees yet. Link this person to the same person in another family tree.
          </Text>
        </View>
      )}

      <RequestAccessModal
        visible={requestModalVisible}
        treeName={selectedTree?.linkedTreeName || ''}
        onClose={() => {
          setRequestModalVisible(false);
          setSelectedTree(null);
        }}
        onSubmit={handleRequestAccess}
        isSubmitting={requestAccessMutation.isPending}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  indicator: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  indicatorText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  linkedTreesList: {
    marginTop: 4,
  },
  linkedTreeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 8,
  },
  treeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  treeIconText: {
    fontSize: 20,
  },
  treeInfo: {
    flex: 1,
  },
  treeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  accessStatus: {
    fontSize: 13,
    color: '#28a745',
    marginTop: 2,
  },
  pendingStatus: {
    color: '#ffc107',
  },
  noAccessStatus: {
    color: '#007AFF',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
  emptyState: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
