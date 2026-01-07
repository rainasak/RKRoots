import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nodeService } from '../../services/nodeService';
import { relationshipService, CreateRelationshipData } from '../../services/relationshipService';
import { RelationshipType, NodeStatus } from '../../types';
import type { Node } from '../../types';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type AddRelationshipScreenNavigationProp = StackNavigationProp<MainStackParamList, 'AddRelationship'>;
type AddRelationshipScreenRouteProp = RouteProp<MainStackParamList, 'AddRelationship'>;

interface AddRelationshipScreenProps {
  navigation: AddRelationshipScreenNavigationProp;
  route: AddRelationshipScreenRouteProp;
}

const RELATIONSHIP_TYPES = [
  { value: RelationshipType.PARENT_CHILD, label: 'Parent-Child', description: 'One person is the parent of the other', icon: '👨‍👧' },
  { value: RelationshipType.SPOUSE, label: 'Spouse', description: 'Married or life partners', icon: '💑' },
  { value: RelationshipType.SIBLING, label: 'Sibling', description: 'Brothers or sisters', icon: '👫' },
  { value: RelationshipType.ADOPTED, label: 'Adopted', description: 'Adoptive relationship', icon: '🤝' },
  { value: RelationshipType.STEP, label: 'Step', description: 'Step-parent or step-sibling', icon: '👪' },
];

const getDisplayName = (node: Node): string => {
  if (node.petName) return node.petName;
  return `${node.firstName || ''} ${node.lastName || ''}`.trim() || 'Unknown';
};

export const AddRelationshipScreen: React.FC<AddRelationshipScreenProps> = ({ navigation, route }) => {
  const { treeId, preselectedNodeId } = route.params;
  const queryClient = useQueryClient();

  const [selectedNode1, setSelectedNode1] = useState<Node | null>(null);
  const [selectedNode2, setSelectedNode2] = useState<Node | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType | null>(null);
  const [showNode1Picker, setShowNode1Picker] = useState(false);
  const [showNode2Picker, setShowNode2Picker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [error, setError] = useState('');

  const { data: nodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ['nodes', treeId],
    queryFn: () => nodeService.getNodes(treeId),
  });

  React.useEffect(() => {
    if (preselectedNodeId && nodes.length > 0 && !selectedNode1) {
      const preselected = nodes.find((n: Node) => n.nodeId === preselectedNodeId);
      if (preselected) setSelectedNode1(preselected);
    }
  }, [preselectedNodeId, nodes, selectedNode1]);

  const availableNodesForNode2 = useMemo(() => {
    if (!selectedNode1) return nodes;
    return nodes.filter((n: Node) => n.nodeId !== selectedNode1.nodeId);
  }, [nodes, selectedNode1]);

  const createRelationshipMutation = useMutation({
    mutationFn: (data: CreateRelationshipData) => relationshipService.createRelationship(treeId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['relationships', treeId] });
      queryClient.invalidateQueries({ queryKey: ['nodes', treeId] });
      
      if (result.publishedNodeIds && result.publishedNodeIds.length > 0) {
        Alert.alert('Success', 'Relationship created and draft nodes have been published!');
      } else {
        Alert.alert('Success', 'Relationship created successfully!');
      }
      navigation.goBack();
    },
    onError: (err: any) => {
      const message = err.response?.data?.error?.message || 'Failed to create relationship';
      setError(message);
    },
  });

  const handleCreate = () => {
    if (!selectedNode1 || !selectedNode2 || !relationshipType) {
      setError('Please select both family members and a relationship type');
      return;
    }
    setError('');

    const hasDraftNode = selectedNode1.status === NodeStatus.DRAFT || selectedNode2.status === NodeStatus.DRAFT;

    if (hasDraftNode) {
      Alert.alert(
        'Publish Draft Members?',
        'This relationship involves draft family members. Creating this relationship will publish them, making them visible to everyone with access to this tree.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create & Publish',
            onPress: () => {
              createRelationshipMutation.mutate({
                nodeId1: selectedNode1.nodeId,
                nodeId2: selectedNode2.nodeId,
                relationshipType,
                publishDraftNodes: true,
              });
            },
          },
        ]
      );
    } else {
      createRelationshipMutation.mutate({
        nodeId1: selectedNode1.nodeId,
        nodeId2: selectedNode2.nodeId,
        relationshipType,
      });
    }
  };

  const isLoading = nodesLoading || createRelationshipMutation.isPending;
  const selectedType = RELATIONSHIP_TYPES.find(t => t.value === relationshipType);

  const renderNodeItem = ({ item, onSelect }: { item: Node; onSelect: (node: Node) => void }) => {
    const isDraft = item.status === NodeStatus.DRAFT;
    return (
      <TouchableOpacity
        style={[styles.nodeItem, isDraft && styles.nodeItemDraft]}
        onPress={() => onSelect(item)}
      >
        <View style={[styles.nodeAvatar, isDraft && styles.nodeAvatarDraft]}>
          <Text style={styles.nodeAvatarText}>{getDisplayName(item).charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.nodeInfo}>
          <Text style={styles.nodeName}>{getDisplayName(item)}</Text>
          {isDraft && <Text style={styles.draftLabel}>Draft</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  if (nodesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (nodes.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Not Enough Members</Text>
        <Text style={styles.emptyText}>
          You need at least 2 family members to create a relationship.
        </Text>
        <TouchableOpacity
          style={styles.addMemberButton}
          onPress={() => navigation.navigate('AddNode', { treeId })}
        >
          <Text style={styles.addMemberButtonText}>Add Family Member</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>First Person</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowNode1Picker(true)}
          disabled={isLoading}
        >
          {selectedNode1 ? (
            <View style={styles.selectedNode}>
              <View style={[styles.selectorAvatar, selectedNode1.status === NodeStatus.DRAFT && styles.selectorAvatarDraft]}>
                <Text style={styles.selectorAvatarText}>{getDisplayName(selectedNode1).charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.selectorText}>{getDisplayName(selectedNode1)}</Text>
              {selectedNode1.status === NodeStatus.DRAFT && <Text style={styles.draftTag}>Draft</Text>}
            </View>
          ) : (
            <Text style={styles.placeholderText}>Select first person...</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Second Person</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowNode2Picker(true)}
          disabled={isLoading || !selectedNode1}
        >
          {selectedNode2 ? (
            <View style={styles.selectedNode}>
              <View style={[styles.selectorAvatar, selectedNode2.status === NodeStatus.DRAFT && styles.selectorAvatarDraft]}>
                <Text style={styles.selectorAvatarText}>{getDisplayName(selectedNode2).charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.selectorText}>{getDisplayName(selectedNode2)}</Text>
              {selectedNode2.status === NodeStatus.DRAFT && <Text style={styles.draftTag}>Draft</Text>}
            </View>
          ) : (
            <Text style={styles.placeholderText}>
              {selectedNode1 ? 'Select second person...' : 'Select first person first'}
            </Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Relationship Type</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowTypePicker(true)}
          disabled={isLoading}
        >
          {selectedType ? (
            <View style={styles.selectedType}>
              <Text style={styles.typeIcon}>{selectedType.icon}</Text>
              <View>
                <Text style={styles.selectorText}>{selectedType.label}</Text>
                <Text style={styles.typeDescription}>{selectedType.description}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.placeholderText}>Select relationship type...</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.createButton, isLoading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={isLoading || !selectedNode1 || !selectedNode2 || !relationshipType}
        >
          {createRelationshipMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Relationship</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Node 1 Picker Modal */}
      <Modal visible={showNode1Picker} animationType="slide" onRequestClose={() => setShowNode1Picker(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select First Person</Text>
            <TouchableOpacity onPress={() => setShowNode1Picker(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={nodes}
            keyExtractor={(item: Node) => item.nodeId}
            renderItem={({ item }) => renderNodeItem({
              item,
              onSelect: (node) => {
                setSelectedNode1(node);
                if (selectedNode2?.nodeId === node.nodeId) setSelectedNode2(null);
                setShowNode1Picker(false);
              },
            })}
            contentContainerStyle={styles.nodeList}
          />
        </View>
      </Modal>

      {/* Node 2 Picker Modal */}
      <Modal visible={showNode2Picker} animationType="slide" onRequestClose={() => setShowNode2Picker(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Second Person</Text>
            <TouchableOpacity onPress={() => setShowNode2Picker(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={availableNodesForNode2}
            keyExtractor={(item: Node) => item.nodeId}
            renderItem={({ item }) => renderNodeItem({
              item,
              onSelect: (node) => {
                setSelectedNode2(node);
                setShowNode2Picker(false);
              },
            })}
            contentContainerStyle={styles.nodeList}
          />
        </View>
      </Modal>

      {/* Relationship Type Picker Modal */}
      <Modal visible={showTypePicker} animationType="slide" onRequestClose={() => setShowTypePicker(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Relationship Type</Text>
            <TouchableOpacity onPress={() => setShowTypePicker(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.typeList}>
            {RELATIONSHIP_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.typeItem, relationshipType === type.value && styles.typeItemSelected]}
                onPress={() => {
                  setRelationshipType(type.value);
                  setShowTypePicker(false);
                }}
              >
                <Text style={styles.typeItemIcon}>{type.icon}</Text>
                <View style={styles.typeItemInfo}>
                  <Text style={[styles.typeItemLabel, relationshipType === type.value && styles.typeItemLabelSelected]}>
                    {type.label}
                  </Text>
                  <Text style={styles.typeItemDescription}>{type.description}</Text>
                </View>
                {relationshipType === type.value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  addMemberButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addMemberButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    minHeight: 60,
  },
  selectedNode: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectorAvatarDraft: {
    backgroundColor: '#6c757d',
  },
  selectorAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectorText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  draftTag: {
    fontSize: 12,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  selectedType: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  chevron: {
    fontSize: 24,
    color: '#999',
    marginLeft: 8,
  },
  error: {
    color: '#dc3545',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalClose: {
    fontSize: 16,
    color: '#007AFF',
  },
  nodeList: {
    padding: 16,
  },
  nodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  nodeItemDraft: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
  },
  nodeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nodeAvatarDraft: {
    backgroundColor: '#6c757d',
  },
  nodeAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  nodeInfo: {
    flex: 1,
  },
  nodeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  draftLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  typeList: {
    padding: 16,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  typeItemSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  typeItemIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  typeItemInfo: {
    flex: 1,
  },
  typeItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  typeItemLabelSelected: {
    color: '#007AFF',
  },
  typeItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: '600',
  },
});
