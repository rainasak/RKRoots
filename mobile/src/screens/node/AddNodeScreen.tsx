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
  Switch,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nodeService } from '../../services/nodeService';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type AddNodeScreenNavigationProp = StackNavigationProp<MainStackParamList, 'AddNode'>;
type AddNodeScreenRouteProp = RouteProp<MainStackParamList, 'AddNode'>;

interface AddNodeScreenProps {
  navigation: AddNodeScreenNavigationProp;
  route: AddNodeScreenRouteProp;
}

export const AddNodeScreen: React.FC<AddNodeScreenProps> = ({ navigation, route }) => {
  const { treeId } = route.params;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [petName, setPetName] = useState('');
  const [usePetName, setUsePetName] = useState(false);
  const [address, setAddress] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const isValidName = (): boolean => {
    if (usePetName) {
      return petName.trim().length > 0;
    }
    return firstName.trim().length > 0 && lastName.trim().length > 0;
  };

  const createNodeMutation = useMutation({
    mutationFn: (data: Parameters<typeof nodeService.createNode>[1]) =>
      nodeService.createNode(treeId, data),
    onSuccess: (newNode) => {
      queryClient.invalidateQueries({ queryKey: ['nodes', treeId] });
      navigation.replace('NodeDetail', { nodeId: newNode.nodeId, treeId });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to create family member');
    },
  });

  const handleCreate = () => {
    if (!isValidName()) {
      setError(usePetName 
        ? 'Pet name is required' 
        : 'First name and last name are required');
      return;
    }
    setError('');

    const nodeData: Parameters<typeof nodeService.createNode>[1] = usePetName
      ? { petName: petName.trim() }
      : { firstName: firstName.trim(), lastName: lastName.trim() };

    if (address.trim()) nodeData.address = address.trim();
    if (placeOfBirth.trim()) nodeData.placeOfBirth = placeOfBirth.trim();

    createNodeMutation.mutate(nodeData);
  };

  const isLoading = createNodeMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Use nickname/pet name only</Text>
          <Switch
            value={usePetName}
            onValueChange={setUsePetName}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            disabled={isLoading}
          />
        </View>

        {usePetName ? (
          <>
            <Text style={styles.label}>Pet Name / Nickname *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Grandma Rose"
              placeholderTextColor="#999"
              value={petName}
              onChangeText={setPetName}
              autoFocus
              editable={!isLoading}
              maxLength={255}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., John"
              placeholderTextColor="#999"
              value={firstName}
              onChangeText={setFirstName}
              autoFocus
              editable={!isLoading}
              maxLength={255}
            />

            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Smith"
              placeholderTextColor="#999"
              value={lastName}
              onChangeText={setLastName}
              editable={!isLoading}
              maxLength={255}
            />

            <Text style={styles.label}>Pet Name / Nickname (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Johnny"
              placeholderTextColor="#999"
              value={petName}
              onChangeText={setPetName}
              editable={!isLoading}
              maxLength={255}
            />
          </>
        )}

        <Text style={styles.label}>Place of Birth (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., New York, NY"
          placeholderTextColor="#999"
          value={placeOfBirth}
          onChangeText={setPlaceOfBirth}
          editable={!isLoading}
          maxLength={255}
        />

        <Text style={styles.label}>Address (optional)</Text>
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

        <Text style={styles.hint}>
          New family members are created as drafts. You can publish them after adding a relationship.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add Family Member</Text>
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1a1a1a',
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
    textAlign: 'center',
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
