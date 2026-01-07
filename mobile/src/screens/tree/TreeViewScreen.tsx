import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
  GestureUpdateEvent,
  PinchGestureHandlerEventPayload,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import Svg, { Line, G } from 'react-native-svg';
import { treeService } from '../../services/treeService';
import { nodeService } from '../../services/nodeService';
import { relationshipService } from '../../services/relationshipService';
import type { Node, Relationship } from '../../types';
import { NodeStatus } from '../../types';
import type { RootState } from '../../store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;
const HORIZONTAL_SPACING = 160;
const VERTICAL_SPACING = 100;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2;

interface NodePosition {
  node: Node;
  x: number;
  y: number;
}

interface LineData {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: string;
}

const getDisplayName = (node: Node): string => {
  if (node.petName) return node.petName;
  return `${node.firstName || ''} ${node.lastName || ''}`.trim() || 'Unknown';
};

const calculateNodePositions = (
  nodes: Node[],
  relationships: Relationship[]
): NodePosition[] => {
  if (!nodes.length) return [];

  // Single pass: build nodeMap, childrenMap, parentMap, and identify roots
  const nodeMap = new Map<string, Node>();
  const childrenMap = new Map<string, string[]>();
  const parentSet = new Set<string>();

  for (const node of nodes) {
    nodeMap.set(node.nodeId, node);
  }

  for (const rel of relationships) {
    if (rel.relationshipType === 'parent_child') {
      const children = childrenMap.get(rel.nodeId1);
      if (children) {
        children.push(rel.nodeId2);
      } else {
        childrenMap.set(rel.nodeId1, [rel.nodeId2]);
      }
      parentSet.add(rel.nodeId2);
    }
  }

  // BFS to assign levels and collect positions in one pass
  const positions: NodePosition[] = [];
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; level: number }> = [];
  const levelCounts = new Map<number, number>();

  // Queue root nodes (nodes without parents) and orphans
  for (const node of nodes) {
    if (!parentSet.has(node.nodeId) && !visited.has(node.nodeId)) {
      queue.push({ nodeId: node.nodeId, level: 0 });
      visited.add(node.nodeId);
    }
  }

  // First pass: count nodes per level for centering
  const tempQueue = [...queue];
  const tempVisited = new Set(visited);
  while (tempQueue.length > 0) {
    const { nodeId, level } = tempQueue.shift()!;
    levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    const children = childrenMap.get(nodeId) || [];
    for (const childId of children) {
      if (!tempVisited.has(childId)) {
        tempVisited.add(childId);
        tempQueue.push({ nodeId: childId, level: level + 1 });
      }
    }
  }

  // Second pass: assign positions using level counts
  const levelIndices = new Map<number, number>();
  const startY = 50;

  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const nodesAtLevel = levelCounts.get(level) || 1;
    const currentIndex = levelIndices.get(level) || 0;
    levelIndices.set(level, currentIndex + 1);

    const totalWidth = nodesAtLevel * HORIZONTAL_SPACING;
    const startX = (SCREEN_WIDTH - totalWidth) / 2 + HORIZONTAL_SPACING / 2;

    positions.push({
      node,
      x: startX + currentIndex * HORIZONTAL_SPACING,
      y: startY + level * VERTICAL_SPACING,
    });

    const children = childrenMap.get(nodeId) || [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push({ nodeId: childId, level: level + 1 });
      }
    }
  }

  return positions;
};

interface TreeViewScreenProps {
  route: { params: { treeId: string } };
  navigation: {
    setOptions: (options: { title: string }) => void;
    navigate: (screen: string, params?: Record<string, string>) => void;
  };
}

export const TreeViewScreen: React.FC<TreeViewScreenProps> = ({ route, navigation }) => {
  const { treeId } = route.params;
  const queryClient = useQueryClient();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['tree', treeId],
    queryFn: () => treeService.getTree(treeId),
  });

  const { data: nodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ['nodes', treeId],
    queryFn: () => nodeService.getNodes(treeId),
  });

  const { data: relationships = [], isLoading: relsLoading } = useQuery({
    queryKey: ['relationships', treeId],
    queryFn: () => relationshipService.getRelationships(treeId),
  });

  const publishMutation = useMutation({
    mutationFn: (nodeId: string) => nodeService.publishNode(treeId, nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes', treeId] });
      setShowContextMenu(false);
      setSelectedNode(null);
      Alert.alert('Success', 'Family member has been published');
    },
    onError: (err: any) => {
      const message = err.response?.data?.error?.message || 'Failed to publish';
      Alert.alert('Cannot Publish', message);
    },
  });

  useEffect(() => {
    if (tree) {
      navigation.setOptions({ title: tree.treeName });
    }
  }, [tree, navigation]);

  const nodePositions = useMemo(
    () => calculateNodePositions(nodes, relationships),
    [nodes, relationships]
  );

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e: GestureUpdateEvent<PinchGestureHandlerEventPayload>) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleNodePress = (node: Node) => {
    navigation.navigate('NodeDetail', { nodeId: node.nodeId, treeId });
  };

  const handleNodeLongPress = (node: Node) => {
    setSelectedNode(node);
    setShowContextMenu(true);
  };

  const handlePublish = () => {
    if (!selectedNode) return;
    Alert.alert(
      'Publish Family Member',
      'This will make this person visible to everyone with access to this tree. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: () => publishMutation.mutate(selectedNode.nodeId) },
      ]
    );
  };

  const handleViewDetails = () => {
    if (!selectedNode) return;
    setShowContextMenu(false);
    navigation.navigate('NodeDetail', { nodeId: selectedNode.nodeId, treeId });
  };

  const handleEdit = () => {
    if (!selectedNode) return;
    setShowContextMenu(false);
    navigation.navigate('EditNode', { nodeId: selectedNode.nodeId, treeId });
  };

  const isLoading = treeLoading || nodesLoading || relsLoading;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const positionMap = new Map<string, NodePosition>();
  nodePositions.forEach((np: NodePosition) => positionMap.set(np.node.nodeId, np));

  const lines: LineData[] = relationships
    .filter((rel: Relationship) => positionMap.has(rel.nodeId1) && positionMap.has(rel.nodeId2))
    .map((rel: Relationship) => {
      const pos1 = positionMap.get(rel.nodeId1)!;
      const pos2 = positionMap.get(rel.nodeId2)!;
      return {
        key: rel.relationshipId,
        x1: pos1.x,
        y1: pos1.y + NODE_HEIGHT / 2,
        x2: pos2.x,
        y2: pos2.y - NODE_HEIGHT / 2,
        type: rel.relationshipType,
      };
    });

  const getLineStyle = (type: string): { stroke: string; strokeWidth: number; strokeDasharray?: string } => {
    switch (type) {
      case 'spouse':
        return { stroke: '#e91e63', strokeWidth: 2, strokeDasharray: '5,5' };
      case 'sibling':
        return { stroke: '#9c27b0', strokeWidth: 2 };
      case 'adopted':
        return { stroke: '#ff9800', strokeWidth: 2, strokeDasharray: '3,3' };
      case 'step':
        return { stroke: '#607d8b', strokeWidth: 2, strokeDasharray: '8,4' };
      default:
        return { stroke: '#2196f3', strokeWidth: 2 };
    }
  };

  const canvasWidth = Math.max(SCREEN_WIDTH, nodePositions.length * HORIZONTAL_SPACING + 100);
  const canvasHeight = Math.max(SCREEN_HEIGHT, (Math.max(...nodePositions.map((p: NodePosition) => p.y), 0) + 200));

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.canvas, animatedStyle]}>
          <Svg width={canvasWidth} height={canvasHeight} style={styles.svg}>
            <G>
              {lines.map((line: LineData) => {
                const lineStyle = getLineStyle(line.type);
                return (
                  <Line
                    key={line.key}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={lineStyle.stroke}
                    strokeWidth={lineStyle.strokeWidth}
                    strokeDasharray={lineStyle.strokeDasharray}
                  />
                );
              })}
            </G>
          </Svg>

          {nodePositions.map(({ node, x, y }: NodePosition) => {
            const isDraft = node.status === NodeStatus.DRAFT;
            return (
              <TouchableOpacity
                key={node.nodeId}
                style={[
                  styles.nodeCard,
                  { left: x - NODE_WIDTH / 2, top: y - NODE_HEIGHT / 2 },
                  isDraft && styles.nodeCardDraft,
                ]}
                onPress={() => handleNodePress(node)}
                onLongPress={() => handleNodeLongPress(node)}
                activeOpacity={0.8}
                delayLongPress={500}
              >
                <Text style={[styles.nodeName, isDraft && styles.nodeNameDraft]} numberOfLines={2}>
                  {getDisplayName(node)}
                </Text>
                {isDraft && (
                  <View style={styles.draftBadge}>
                    <Text style={styles.draftBadgeText}>DRAFT</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </GestureDetector>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddNode', { treeId })}
        >
          <Text style={styles.addButtonText}>+ Add Member</Text>
        </TouchableOpacity>
        {nodes.length >= 2 && (
          <TouchableOpacity
            style={[styles.addButton, styles.relationshipButton]}
            onPress={() => navigation.navigate('AddRelationship', { treeId })}
          >
            <Text style={styles.addButtonText}>🔗 Add Relationship</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.addButton, styles.timelineButton]}
          onPress={() => navigation.navigate('Timeline', { treeId })}
        >
          <Text style={styles.addButtonText}>📅 Timeline</Text>
        </TouchableOpacity>
        {tree && currentUser && tree.ownerUserId === currentUser.userId && (
          <TouchableOpacity
            style={[styles.addButton, styles.accessRequestsButton]}
            onPress={() => navigation.navigate('AccessRequests', { treeId, treeName: tree.treeName })}
          >
            <Text style={styles.addButtonText}>📬 Access Requests</Text>
          </TouchableOpacity>
        )}
        {tree && currentUser && tree.ownerUserId === currentUser.userId && (
          <TouchableOpacity
            style={[styles.addButton, styles.shareButton]}
            onPress={() => navigation.navigate('ShareTree', { treeId, treeName: tree.treeName })}
          >
            <Text style={styles.addButtonText}>👥 Share Tree</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.addButton, styles.albumButton]}
          onPress={() => navigation.navigate('AlbumList', { treeId, treeName: tree?.treeName || 'Family Tree' })}
        >
          <Text style={styles.addButtonText}>🖼️ Photo Albums</Text>
        </TouchableOpacity>
      </View>

      {nodes.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No family members yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap "Add Member" to start building your family tree
          </Text>
        </View>
      )}

      <View style={styles.hint}>
        <Text style={styles.hintText}>Pinch to zoom • Drag to pan • Double-tap to reset • Long-press for options</Text>
      </View>

      {relationships.length > 0 && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Relationships:</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: '#2196f3' }]} />
              <Text style={styles.legendText}>Parent-Child</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, styles.legendLineDashed, { backgroundColor: '#e91e63' }]} />
              <Text style={styles.legendText}>Spouse</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: '#9c27b0' }]} />
              <Text style={styles.legendText}>Sibling</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, styles.legendLineDotted, { backgroundColor: '#ff9800' }]} />
              <Text style={styles.legendText}>Adopted</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, styles.legendLineDashDot, { backgroundColor: '#607d8b' }]} />
              <Text style={styles.legendText}>Step</Text>
            </View>
          </View>
        </View>
      )}

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
            <Text style={styles.contextMenuTitle}>
              {selectedNode ? getDisplayName(selectedNode) : ''}
            </Text>
            <TouchableOpacity style={styles.menuItem} onPress={handleViewDetails}>
              <Text style={styles.menuItemText}>👤 View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Text style={styles.menuItemText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowContextMenu(false);
              if (selectedNode) {
                navigation.navigate('AddRelationship', { treeId, preselectedNodeId: selectedNode.nodeId });
              }
            }}>
              <Text style={styles.menuItemText}>🔗 Add Relationship</Text>
            </TouchableOpacity>
            {selectedNode?.status === NodeStatus.DRAFT && (
              <TouchableOpacity style={styles.menuItem} onPress={handlePublish}>
                <Text style={styles.menuItemText}>📤 Publish</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowContextMenu(false)}>
              <Text style={[styles.menuItemText, styles.menuItemTextCancel]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </GestureHandlerRootView>
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
  canvas: {
    flex: 1,
    position: 'relative',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  nodeCard: {
    position: 'absolute',
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  nodeCardDraft: {
    borderColor: '#6c757d',
    borderStyle: 'dashed',
    opacity: 0.8,
    backgroundColor: '#f8f9fa',
  },
  nodeName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
  },
  nodeNameDraft: {
    color: '#6c757d',
  },
  draftBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#6c757d',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  draftBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  relationshipButton: {
    backgroundColor: '#28a745',
    marginTop: 10,
    shadowColor: '#28a745',
  },
  timelineButton: {
    backgroundColor: '#ff9800',
    marginTop: 10,
    shadowColor: '#ff9800',
  },
  accessRequestsButton: {
    backgroundColor: '#9c27b0',
    marginTop: 10,
    shadowColor: '#9c27b0',
  },
  shareButton: {
    backgroundColor: '#17a2b8',
    marginTop: 10,
    shadowColor: '#17a2b8',
  },
  albumButton: {
    backgroundColor: '#6f42c1',
    marginTop: 10,
    shadowColor: '#6f42c1',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
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
  contextMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  menuItemTextCancel: {
    color: '#666',
  },
  legend: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'column',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendLine: {
    width: 20,
    height: 2,
    marginRight: 8,
  },
  legendLineDashed: {
    borderStyle: 'dashed',
  },
  legendLineDotted: {
    borderStyle: 'dotted',
  },
  legendLineDashDot: {
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 10,
    color: '#666',
  },
});
