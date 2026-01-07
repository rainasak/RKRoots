import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import { albumService } from '../../services/albumService';
import { AlbumSource, PhotoAlbum } from '../../types';

type AlbumListScreenNavigationProp = StackNavigationProp<MainStackParamList, 'AlbumList'>;
type AlbumListScreenRouteProp = RouteProp<MainStackParamList, 'AlbumList'>;

interface AlbumListScreenProps {
  navigation: AlbumListScreenNavigationProp;
  route: AlbumListScreenRouteProp;
}

const getSourceIcon = (source: AlbumSource): string => {
  switch (source) {
    case AlbumSource.GOOGLE_DRIVE:
      return '📁';
    case AlbumSource.GOOGLE_PHOTOS:
      return '📷';
    default:
      return '🖼️';
  }
};

const getSourceLabel = (source: AlbumSource): string => {
  switch (source) {
    case AlbumSource.GOOGLE_DRIVE:
      return 'Google Drive';
    case AlbumSource.GOOGLE_PHOTOS:
      return 'Google Photos';
    default:
      return 'Unknown';
  }
};

export const AlbumListScreen: React.FC<AlbumListScreenProps> = ({ route, navigation }) => {
  const { treeId, treeName } = route.params;
  const queryClient = useQueryClient();

  const { data: albums = [], isLoading, error } = useQuery({
    queryKey: ['albums', treeId],
    queryFn: () => albumService.getAlbums(treeId),
  });

  const deleteMutation = useMutation({
    mutationFn: (albumId: string) => albumService.deleteAlbum(albumId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', treeId] });
      Alert.alert('Success', 'Album unlinked successfully');
    },
    onError: (err: any) => {
      const message = err.response?.data?.error?.message || 'Failed to unlink album';
      Alert.alert('Error', message);
    },
  });

  const handleDelete = (album: PhotoAlbum) => {
    Alert.alert(
      'Unlink Album',
      `Are you sure you want to unlink "${album.albumName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(album.albumId),
        },
      ]
    );
  };

  const renderAlbum = ({ item }: { item: PhotoAlbum }) => (
    <View style={styles.albumCard}>
      <View style={styles.albumIcon}>
        <Text style={styles.albumIconText}>{getSourceIcon(item.albumSource)}</Text>
      </View>
      <View style={styles.albumInfo}>
        <Text style={styles.albumName}>{item.albumName}</Text>
        <Text style={styles.albumSource}>{getSourceLabel(item.albumSource)}</Text>
        <Text style={styles.albumDate}>
          Linked {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
        disabled={deleteMutation.isPending}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load albums</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => queryClient.invalidateQueries({ queryKey: ['albums', treeId] })}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Photo Albums</Text>
        <Text style={styles.headerSubtitle}>{treeName}</Text>
      </View>

      {albums.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🖼️</Text>
          <Text style={styles.emptyTitle}>No albums linked</Text>
          <Text style={styles.emptySubtitle}>
            Link a Google Drive or Google Photos album to display family photos
          </Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.albumId}
          renderItem={renderAlbum}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('LinkAlbum', { treeId, treeName })}
      >
        <Text style={styles.addButtonText}>+ Link Album</Text>
      </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  albumIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  albumIconText: {
    fontSize: 24,
  },
  albumInfo: {
    flex: 1,
  },
  albumName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  albumSource: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  albumDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
