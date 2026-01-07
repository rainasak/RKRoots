import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { searchService } from '../../services/searchService';
import { treeService } from '../../services/treeService';
import type { SearchResult, SearchFilters, FamilyTree } from '../../types';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type SearchScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Search'>;

interface SearchScreenProps {
  navigation: SearchScreenNavigationProp;
}

interface TreeFilterOption {
  treeId: string | undefined;
  treeName: string;
}

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 300;

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedTreeId, setSelectedTreeId] = useState<string | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: trees } = useQuery({
    queryKey: ['trees'],
    queryFn: treeService.getTrees,
  });

  const {
    data: results,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['search', debouncedQuery, selectedTreeId, filters],
    queryFn: () => searchService.searchNodes(debouncedQuery, { ...filters, treeId: selectedTreeId }),
    enabled: debouncedQuery.length >= MIN_SEARCH_LENGTH,
  });

  useFocusEffect(
    useCallback(() => {
      return () => {
        setSearchQuery('');
        setDebouncedQuery('');
        setFilters({});
        setSelectedTreeId(undefined);
      };
    }, [])
  );

  const handleSearch = () => {
    if (searchQuery.length >= MIN_SEARCH_LENGTH) {
      Keyboard.dismiss();
      setDebouncedQuery(searchQuery);
    }
  };

  const getDisplayName = (item: SearchResult): string => {
    if (item.petName) return item.petName;
    return `${item.firstName || ''} ${item.lastName || ''}`.trim();
  };

  const renderResultCard = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('NodeDetail', { nodeId: item.nodeId, treeId: item.treeId })}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {getDisplayName(item).charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.name}>{getDisplayName(item)}</Text>
          {item.firstName && item.lastName && item.petName && (
            <Text style={styles.fullName}>
              {item.firstName} {item.lastName}
            </Text>
          )}
          <View style={styles.treeTag}>
            <Text style={styles.treeIcon}>🌳</Text>
            <Text style={styles.treeName}>{item.treeName}</Text>
          </View>
          {item.placeOfBirth && (
            <Text style={styles.birthPlace}>📍 {item.placeOfBirth}</Text>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTreeFilter = () => {
    const treeOptions: TreeFilterOption[] = [
      { treeId: undefined, treeName: 'All Trees' },
      ...(trees || []).map((t: FamilyTree) => ({ treeId: t.treeId, treeName: t.treeName })),
    ];

    return (
      <View style={styles.treeFilterContainer}>
        <Text style={styles.filterLabel}>Search in:</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={treeOptions}
          keyExtractor={(item: TreeFilterOption) => item.treeId || 'all'}
          renderItem={({ item }: { item: TreeFilterOption }) => (
            <TouchableOpacity
              style={[
                styles.treeChip,
                (selectedTreeId === item.treeId || (!selectedTreeId && !item.treeId)) && styles.treeChipSelected,
              ]}
              onPress={() => setSelectedTreeId(item.treeId)}
            >
              <Text
                style={[
                  styles.treeChipText,
                  (selectedTreeId === item.treeId || (!selectedTreeId && !item.treeId)) && styles.treeChipTextSelected,
                ]}
              >
                {item.treeName}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderAdvancedFilters = () => (
    <View style={styles.advancedFilters}>
      <TextInput
        style={styles.filterInput}
        placeholder="First Name"
        placeholderTextColor="#999"
        value={filters.firstName || ''}
        onChangeText={(text: string) => setFilters({ ...filters, firstName: text || undefined })}
      />
      <TextInput
        style={styles.filterInput}
        placeholder="Last Name"
        placeholderTextColor="#999"
        value={filters.lastName || ''}
        onChangeText={(text: string) => setFilters({ ...filters, lastName: text || undefined })}
      />
      <TextInput
        style={styles.filterInput}
        placeholder="Pet Name / Nickname"
        placeholderTextColor="#999"
        value={filters.petName || ''}
        onChangeText={(text: string) => setFilters({ ...filters, petName: text || undefined })}
      />
      <TextInput
        style={styles.filterInput}
        placeholder="Place of Birth"
        placeholderTextColor="#999"
        value={filters.placeOfBirth || ''}
        onChangeText={(text: string) => setFilters({ ...filters, placeOfBirth: text || undefined })}
      />
    </View>
  );

  const renderEmptyState = () => {
    if (debouncedQuery.length < MIN_SEARCH_LENGTH) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Search Family Members</Text>
          <Text style={styles.emptySubtitle}>
            Enter at least 3 characters to search across your accessible family trees
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>😕</Text>
        <Text style={styles.emptyTitle}>No results found</Text>
        <Text style={styles.emptySubtitle}>
          Try adjusting your search or filters
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearButton}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {renderTreeFilter()}

      <TouchableOpacity
        style={styles.filterToggle}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Text style={styles.filterToggleText}>
          {showFilters ? '▼ Hide Filters' : '▶ Advanced Filters'}
        </Text>
      </TouchableOpacity>

      {showFilters && renderAdvancedFilters()}

      {(isLoading || isFetching) && debouncedQuery.length >= MIN_SEARCH_LENGTH ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item: SearchResult) => item.nodeId}
          renderItem={renderResultCard}
          contentContainerStyle={!results?.length ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={renderEmptyState}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1a1a1a',
  },
  clearButton: {
    fontSize: 16,
    color: '#999',
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  treeFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  treeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  treeChipSelected: {
    backgroundColor: '#007AFF',
  },
  treeChipText: {
    fontSize: 14,
    color: '#666',
  },
  treeChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  filterToggle: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterToggleText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  advancedFilters: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
    color: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1976d2',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  fullName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  treeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  treeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  treeName: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '500',
  },
  birthPlace: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});
