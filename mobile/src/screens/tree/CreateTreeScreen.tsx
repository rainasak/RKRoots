import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { treeService } from '../../services/treeService';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type CreateTreeScreenNavigationProp = StackNavigationProp<MainStackParamList, 'CreateTree'>;

interface CreateTreeScreenProps {
  navigation: CreateTreeScreenNavigationProp;
}

export const CreateTreeScreen: React.FC<CreateTreeScreenProps> = ({ navigation }) => {
  const [treeName, setTreeName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const createTreeMutation = useMutation({
    mutationFn: treeService.createTree,
    onSuccess: (newTree) => {
      queryClient.invalidateQueries({ queryKey: ['trees'] });
      navigation.replace('TreeView', { treeId: newTree.treeId });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to create tree');
    },
  });

  const handleCreate = () => {
    const trimmedName = treeName.trim();
    if (!trimmedName) {
      setError('Tree name is required');
      return;
    }
    setError('');
    createTreeMutation.mutate({
      treeName: trimmedName,
      description: description.trim() || undefined,
    });
  };

  const isLoading = createTreeMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Tree Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Smith Family Tree"
          placeholderTextColor="#999"
          value={treeName}
          onChangeText={setTreeName}
          autoFocus
          editable={!isLoading}
          maxLength={255}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add a description for your family tree..."
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!isLoading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Tree</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textArea: {
    minHeight: 100,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  error: {
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});
