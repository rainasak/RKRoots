import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import { albumService } from '../../services/albumService';
import { AlbumSource } from '../../types';

type LinkAlbumScreenNavigationProp = StackNavigationProp<MainStackParamList, 'LinkAlbum'>;
type LinkAlbumScreenRouteProp = RouteProp<MainStackParamList, 'LinkAlbum'>;

interface LinkAlbumScreenProps {
  navigation: LinkAlbumScreenNavigationProp;
  route: LinkAlbumScreenRouteProp;
}

export const LinkAlbumScreen: React.FC<LinkAlbumScreenProps> = ({ route, navigation }) => {
  const { treeId, treeName } = route.params;
  const queryClient = useQueryClient();

  const [selectedSource, setSelectedSource] = useState<AlbumSource | null>(null);
  const [albumName, setAlbumName] = useState('');
  const [albumIdentifier, setAlbumIdentifier] = useState('');

  const linkMutation = useMutation({
    mutationFn: () =>
      albumService.linkAlbum(treeId, {
        albumSource: selectedSource!,
        albumIdentifier,
        albumName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', treeId] });
      Alert.alert('Success', 'Album linked successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      const message = err.response?.data?.error?.message || 'Failed to link album';
      Alert.alert('Error', message);
    },
  });

  const handleSubmit = () => {
    if (!selectedSource) {
      Alert.alert('Error', 'Please select an album source');
      return;
    }
    if (!albumName.trim()) {
      Alert.alert('Error', 'Please enter an album name');
      return;
    }
    if (!albumIdentifier.trim()) {
      Alert.alert('Error', 'Please enter the album ID or URL');
      return;
    }
    linkMutation.mutate();
  };

  const openHelp = (source: AlbumSource) => {
    const urls = {
      [AlbumSource.GOOGLE_DRIVE]: 'https://support.google.com/drive/answer/7166529',
      [AlbumSource.GOOGLE_PHOTOS]: 'https://support.google.com/photos/answer/6128858',
    };
    Linking.openURL(urls[source]);
  };

  const getPlaceholder = (): string => {
    if (selectedSource === AlbumSource.GOOGLE_DRIVE) {
      return 'Folder ID (e.g., 1ABC...xyz)';
    }
    if (selectedSource === AlbumSource.GOOGLE_PHOTOS) {
      return 'Album ID or shared album URL';
    }
    return 'Album identifier';
  };

  const getHelpText = (): string => {
    if (selectedSource === AlbumSource.GOOGLE_DRIVE) {
      return 'Copy the folder ID from the Google Drive URL. The ID is the string after /folders/ in the URL.';
    }
    if (selectedSource === AlbumSource.GOOGLE_PHOTOS) {
      return 'Share your album and copy the album ID from the shared link, or paste the full shared URL.';
    }
    return '';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Link Photo Album</Text>
        <Text style={styles.headerSubtitle}>to {treeName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Source</Text>
        <View style={styles.sourceOptions}>
          <TouchableOpacity
            style={[
              styles.sourceOption,
              selectedSource === AlbumSource.GOOGLE_DRIVE && styles.sourceOptionSelected,
            ]}
            onPress={() => setSelectedSource(AlbumSource.GOOGLE_DRIVE)}
          >
            <Text style={styles.sourceIcon}>📁</Text>
            <Text
              style={[
                styles.sourceLabel,
                selectedSource === AlbumSource.GOOGLE_DRIVE && styles.sourceLabelSelected,
              ]}
            >
              Google Drive
            </Text>
            {selectedSource === AlbumSource.GOOGLE_DRIVE && (
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => openHelp(AlbumSource.GOOGLE_DRIVE)}
              >
                <Text style={styles.helpButtonText}>?</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sourceOption,
              selectedSource === AlbumSource.GOOGLE_PHOTOS && styles.sourceOptionSelected,
            ]}
            onPress={() => setSelectedSource(AlbumSource.GOOGLE_PHOTOS)}
          >
            <Text style={styles.sourceIcon}>📷</Text>
            <Text
              style={[
                styles.sourceLabel,
                selectedSource === AlbumSource.GOOGLE_PHOTOS && styles.sourceLabelSelected,
              ]}
            >
              Google Photos
            </Text>
            {selectedSource === AlbumSource.GOOGLE_PHOTOS && (
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => openHelp(AlbumSource.GOOGLE_PHOTOS)}
              >
                <Text style={styles.helpButtonText}>?</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {selectedSource && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Album Name</Text>
            <TextInput
              style={styles.input}
              value={albumName}
              onChangeText={setAlbumName}
              placeholder="Enter a name for this album"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Album Identifier</Text>
            <TextInput
              style={styles.input}
              value={albumIdentifier}
              onChangeText={setAlbumIdentifier}
              placeholder={getPlaceholder()}
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helpText}>{getHelpText()}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Make sure the album is shared or accessible. Photos from this album can be displayed
              as backgrounds in your family tree view.
            </Text>
          </View>
        </>
      )}

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!selectedSource || !albumName.trim() || !albumIdentifier.trim()) &&
            styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={
          linkMutation.isPending ||
          !selectedSource ||
          !albumName.trim() ||
          !albumIdentifier.trim()
        }
      >
        {linkMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Link Album</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  sourceOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  sourceOption: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  sourceOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  sourceIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  sourceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sourceLabelSelected: {
    color: '#007AFF',
  },
  helpButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
