import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { samePersonLinkService } from '../../services/samePersonLinkService';
import { searchService } from '../../services/searchService';
import { treeService } from '../../services/treeService';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import type { SearchResult } from '../../types';

type CreateSamePersonLinkScreenNavigationProp = StackNavigationProp<MainStackParamList, 'CreateSamePersonLink'>;
type CreateSamePersonLinkScreenRouteProp = RouteProp<MainStackParamList, 'CreateSamePersonLink'>;

interface CreateSamePersonLinkScreenProps {
  navigation: CreateSamePersonLinkScreenNavigationProp;
  route: CreateSamePersonLinkScreenRouteProp;
}

const getDisplayName = (node: { firstName?: string; lastName?: string; petName?: string }): string => {
  if (node.petName) return node.petName;
  return `${node.firstName || ''} ${node.lastName || ''}`.trim() || 'Unknown';
};

export const CreateSamePersonLinkScreen: React.FC<CreateSamePersonLinkScreenProps> = ({ navigation, route }) => {
  const { nodeId, treeId, nodeName } = route.params;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<SearchResult | null>(null);

  const { data: trees } = useQuery({
    queryKey: ['trees'],
    queryFn: () => treeService.getTrees(),
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => searchService.search(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const filteredResults = searchResults?.filter(
    (result) => result.treeId !== treeId && result.nodeId !== nodeId
  );

  const createLinkMutation = useMutation({
    mutationFn: () => samePersonLinkService.createLink(nodeId, selectedNode!.nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedTreeInfo', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['linkedNodes', nodeId] });
      Alert.alert('Success', 'Same person link created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      const message = err.response?.data?.error?.message || 'Failed to create link';
      Alert.alert('Error', message);
    },
  });

  const handleCreateLink = () => {
    if (!selectedNode) return;

    Alert.alert(
      'Create Same Person Link',
      `Link "${nodeName}" with "${getDisplayName(selectedNode)}" from "${selectedNode.treeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create Link', onPress: () => createLinkMutation.mutate() },
      ]
    );
  };

  const getTreeName = (treeId: string): string => {
    const tree = trees?.find((t) => t.treeId === treeId);
    return tree?.treeName || 'Unknown Tree';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Link Same Person</Text>
        <Text style={styles.headerSubtitle}>
          Find the same person in another family tree to create a connection
        </Text>
      </View>

      <View style={styles.sourceNode}>
        <Text style={styles.sourceLabel}>Linking from:</Text>
        <Text style={styles.sourceName}>{nodeName}</Text>
        <Text style={styles.sourceTree}>{getTreeName(treeId)}</Text>
      </View>

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for person in other trees..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <Text style={styles.searchHint}>Enter at least 2 characters to search</Text>
        )}
      </View>

      <ScrollView style={styles.resultsContainer}>
        {isSearching && (
          <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
        )}

        {filteredResults && filteredResults.length === 0 && searchQuery.length >= 2 && (
          <Text style={styles.noResults}>No matching people found in other trees</Text>
        )}

        {filteredResults?.map((result) => (
          <TouchableOpacity
            key={result.nodeId}
            style={[
              styles.resultItem,
              selectedNode?.nodeId === result.nodeId && styles.resultItemSelected,
            ]}
            onPress={() => setSelectedNode(result)}
          >
            <View style={styles.resultAvatar}>
              <Text style={styles.resultAvatarText}>
                {getDisplayName(result).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{getDisplayName(result)}</Text>
              <Text style={styles.resultTree}>{result.treeName}</Text>
            </View>
            {selectedNode?.nodeId === result.nodeId && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedNode && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createButton, createLinkMutation.isPending && styles.buttonDisabled]}
            onPress={handleCreateLink}
            disabled={createLinkMutation.isPending}
          >
            {createLinkMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Link</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  sourceNode: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  sourceLabel: {
    fontSize: 12,
    color: '#1976d2',
    marginBottom: 4,
  },
  sourceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sourceTree: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 4,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loader: {
    marginTop: 20,
  },
  noResults: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 14,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  resultItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  resultTree: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
