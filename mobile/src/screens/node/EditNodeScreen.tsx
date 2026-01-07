import React, { useState, useEffect } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nodeService } from '../../services/nodeService';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type EditNodeScreenNavigationProp = StackNavigationProp<MainStackParamList, 'EditNode'>;
type EditNodeScreenRouteProp = RouteProp<MainStackParamList, 'EditNode'>;

interface EditNodeScreenProps {
  navigation: EditNodeScreenNavigationProp;
  route: EditNodeScreenRouteProp;
}

export const EditNodeScreen: React.FC<EditNodeScreenProps> = ({ navigation, route }) => {
  const { nodeId, treeId } = route.params;
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [petName, setPetName] = useState('');
  const [address, setAddress] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [error, setError] = useState('');

  const { data: node, isLoading: nodeLoading } = useQuery({
    queryKey: ['node', treeId, nodeId],
    queryFn: () => nodeService.getNode(treeId, nodeId),
  });

  useEffect(() => {
    if (node) {
      setFirstName(node.firstName || '');
      setLastName(node.lastName || '');
      setPetName(node.petName || '');
      setAddress(node.address || '');
      setPlaceOfBirth(node.placeOfBirth || '');
    }
  }, [node]);

  const isValidName = (): boolean => {
    const hasPetName = petName.trim().length > 0;
    const hasFullName = firstName.trim().length > 0 && lastName.trim().length > 0;
    return hasPetName || hasFullName;
  };

  const updateNodeMutation = useMutation({
    mutationFn: (data: Parameters<typeof nodeService.updateNode>[2]) =>
      nodeService.updateNode(treeId, nodeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node', treeId, nodeId] });
      queryClient.invalidateQueries({ queryKey: ['nodes', treeId] });
      navigation.goBack();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to update family member');
    },
  });

  const handleSave = () => {
    if (!isValidName()) {
      setError('Either first name and last name, or pet name must be provided');
      return;
    }
    setError('');

    const nodeData: Parameters<typeof nodeService.updateNode>[2] = {
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      petName: petName.trim() || undefined,
      address: address.trim() || undefined,
      placeOfBirth: placeOfBirth.trim() || undefined,
    };

    updateNodeMutation.mutate(nodeData);
  };

  const isLoading = nodeLoading || updateNodeMutation.isPending;

  if (nodeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., John"
          placeholderTextColor="#999"
          value={firstName}
          onChangeText={setFirstName}
          editable={!isLoading}
          maxLength={255}
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Smith"
          placeholderTextColor="#999"
          value={lastName}
          onChangeText={setLastName}
          editable={!isLoading}
          maxLength={255}
        />

        <Text style={styles.label}>Pet Name / Nickname</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Johnny"
          placeholderTextColor="#999"
          value={petName}
          onChangeText={setPetName}
          editable={!isLoading}
          maxLength={255}
        />

        <Text style={styles.hint}>
          Either first name and last name, or pet name must be provided.
        </Text>

        <Text style={styles.label}>Place of Birth</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., New York, NY"
          placeholderTextColor="#999"
          value={placeOfBirth}
          onChangeText={setPlaceOfBirth}
          editable={!isLoading}
          maxLength={255}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Current address..."
          placeholderTextColor="#999"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          editable={!isLoading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {updateNodeMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    minHeight: 80,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
    marginTop: -12,
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
