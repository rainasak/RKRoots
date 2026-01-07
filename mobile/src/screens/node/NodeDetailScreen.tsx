import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { nodeService } from '../../services/nodeService';
import { NodeStatus, EntityType } from '../../types';
import { LinkedTreesSection } from '../../components/LinkedTreesSection';
import { CommentsSection } from '../../components/CommentsSection';
import type { Node } from '../../types';
import type { RootState } from '../../store';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type NodeDetailScreenNavigationProp = StackNavigationProp<MainStackParamList, 'NodeDetail'>;
type NodeDetailScreenRouteProp = RouteProp<MainStackParamList, 'NodeDetail'>;

interface NodeDetailScreenProps {
  navigation: NodeDetailScreenNavigationProp;
  route: NodeDetailScreenRouteProp;
}

const getDisplayName = (node: Node): string => {
  if (node.petName) return node.petName;
  return `${node.firstName || ''} ${node.lastName || ''}`.trim() || 'Unknown';
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const NodeDetailScreen: React.FC<NodeDetailScreenProps> = ({ navigation, route }) => {
  const { nodeId, treeId } = route.params;
  const queryClient = useQueryClient();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const { data: node, isLoading, error } = useQuery({
    queryKey: ['node', treeId, nodeId],
    queryFn: () => nodeService.getNode(treeId, nodeId),
  });

  const publishMutation = useMutation({
    mutationFn: () => nodeService.publishNode(treeId, nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node', treeId, nodeId] });
      queryClient.invalidateQueries({ queryKey: ['nodes', treeId] });
      Alert.alert('Success', 'Family member has been published');
    },
    onError: (err: any) => {
      const message = err.response?.data?.error?.message || 'Failed to publish';
      Alert.alert('Cannot Publish', message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => nodeService.deleteNode(treeId, nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes', treeId] });
      navigation.goBack();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to delete');
    },
  });

  const handlePublish = () => {
    setShowContextMenu(false);
    Alert.alert(
      'Publish Family Member',
      'This will make this person visible to everyone with access to this tree. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: () => publishMutation.mutate() },
      ]
    );
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    Alert.alert(
      'Delete Family Member',
      'Are you sure you want to delete this person? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const handleEdit = () => {
    setShowContextMenu(false);
    navigation.navigate('EditNode', { nodeId, treeId });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !node) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load family member</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDraft = node.status === NodeStatus.DRAFT;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isDraft && (
          <View style={styles.draftBanner}>
            <Text style={styles.draftBannerText}>📝 Draft - Only visible to you</Text>
          </View>
        )}

        <View style={styles.header}>
          <View style={[styles.avatar, isDraft && styles.avatarDraft]}>
            <Text style={styles.avatarText}>
              {getDisplayName(node).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{getDisplayName(node)}</Text>
          {isDraft && <View style={styles.draftBadge}><Text style={styles.draftBadgeText}>DRAFT</Text></View>}
        </View>

        {node.firstName && node.lastName && node.petName && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Full Name</Text>
            <Text style={styles.infoText}>{node.firstName} {node.lastName}</Text>
          </View>
        )}

        {node.dateOfBirth && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Date of Birth</Text>
            <Text style={styles.infoText}>{formatDate(node.dateOfBirth)}</Text>
          </View>
        )}

        {node.dateOfDeath && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Date of Death</Text>
            <Text style={styles.infoText}>{formatDate(node.dateOfDeath)}</Text>
          </View>
        )}

        {node.placeOfBirth && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Place of Birth</Text>
            <Text style={styles.infoText}>{node.placeOfBirth}</Text>
          </View>
        )}

        {node.address && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Address</Text>
            <Text style={styles.infoText}>{node.address}</Text>
          </View>
        )}

        {!isDraft && (
          <LinkedTreesSection
            nodeId={nodeId}
            onNavigateToTree={(linkedTreeId) => {
              navigation.push('TreeView', { treeId: linkedTreeId });
            }}
            onCreateLink={() => {
              navigation.navigate('CreateSamePersonLink', {
                nodeId,
                treeId,
                nodeName: getDisplayName(node),
              });
            }}
          />
        )}

        {!isDraft && currentUser && (
          <CommentsSection
            treeId={treeId}
            entityType={EntityType.NODE}
            entityId={nodeId}
            currentUserId={currentUser.userId}
          />
        )}

        {isDraft && (
          <View style={styles.draftInfo}>
            <Text style={styles.draftInfoTitle}>About Draft Status</Text>
            <Text style={styles.draftInfoText}>
              This family member is currently a draft and only visible to you. 
              To publish, add a relationship to an existing published family member, 
              or use the menu to publish manually (if this is the first person in the tree).
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowContextMenu(true)}
      >
        <Text style={styles.menuButtonText}>⋯</Text>
      </TouchableOpacity>

      <Modal
        visible={showContextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowContextMenu(false)}
        >
          <View style={styles.contextMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Text style={styles.menuItemText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowContextMenu(false);
              navigation.navigate('AddRelationship', { treeId, preselectedNodeId: nodeId });
            }}>
              <Text style={styles.menuItemText}>🔗 Add Relationship</Text>
            </TouchableOpacity>
            {!isDraft && (
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setShowContextMenu(false);
                navigation.navigate('CreateSamePersonLink', {
                  nodeId,
                  treeId,
                  nodeName: getDisplayName(node),
                });
              }}>
                <Text style={styles.menuItemText}>👥 Link Same Person</Text>
              </TouchableOpacity>
            )}
            {isDraft && (
              <TouchableOpacity style={styles.menuItem} onPress={handlePublish}>
                <Text style={styles.menuItemText}>📤 Publish</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleDelete}>
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>🗑️ Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowContextMenu(false)}>
              <Text style={[styles.menuItemText, styles.menuItemTextCancel]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 24,
  },
  draftBanner: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  draftBannerText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarDraft: {
    backgroundColor: '#6c757d',
    opacity: 0.8,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  draftBadge: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  draftBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  draftInfo: {
    backgroundColor: '#e9ecef',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  draftInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  draftInfoText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  menuButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButtonText: {
    fontSize: 24,
    color: '#1a1a1a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '80%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  menuItemDanger: {
    borderBottomWidth: 1,
  },
  menuItemTextDanger: {
    color: '#dc3545',
  },
  menuItemTextCancel: {
    color: '#666',
  },
});
