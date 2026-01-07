import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

interface RequestAccessModalProps {
  visible: boolean;
  treeName: string;
  onClose: () => void;
  onSubmit: (level: 'viewer' | 'editor') => void;
  isSubmitting: boolean;
}

export const RequestAccessModal: React.FC<RequestAccessModalProps> = ({
  visible,
  treeName,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'viewer' | 'editor'>('viewer');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Request Access</Text>
          <Text style={styles.subtitle}>
            Request access to "{treeName}" to view the connected family tree
          </Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[styles.option, selectedLevel === 'viewer' && styles.optionSelected]}
              onPress={() => setSelectedLevel('viewer')}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.radio, selectedLevel === 'viewer' && styles.radioSelected]}>
                  {selectedLevel === 'viewer' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.optionTitle}>Viewer</Text>
              </View>
              <Text style={styles.optionDescription}>
                View family members and their information
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, selectedLevel === 'editor' && styles.optionSelected]}
              onPress={() => setSelectedLevel('editor')}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.radio, selectedLevel === 'editor' && styles.radioSelected]}>
                  {selectedLevel === 'editor' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.optionTitle}>Editor</Text>
              </View>
              <Text style={styles.optionDescription}>
                View and edit family members, add relationships
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={() => onSubmit(selectedLevel)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Send Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  option: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
